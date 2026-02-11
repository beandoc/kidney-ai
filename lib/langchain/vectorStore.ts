import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { getEmbeddings, getChatModel, QUERY_REFINER_PROMPT } from "./config";
import * as fs from "fs";
import * as path from "path";
import { getPineconeStore } from "./pinecone";
import { HumanMessage } from "@langchain/core/messages";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");

// In-memory store for runtime (will be populated from files)
let vectorStore: MemoryVectorStore | null = null;

// Simple Query Cache
const queryCache = new Map<string, { docs: Document[], timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Load all documents from the knowledge_base directory
 */
async function loadDocuments(): Promise<Document[]> {
    const documents: Document[] = [];

    if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
        console.log("Knowledge base directory not found. Creating...");
        fs.mkdirSync(KNOWLEDGE_BASE_PATH, { recursive: true });
        return documents;
    }

    const files = fs.readdirSync(KNOWLEDGE_BASE_PATH);

    for (const file of files) {
        const filePath = path.join(KNOWLEDGE_BASE_PATH, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();

            // Handle different file types
            if ([".txt", ".md"].includes(ext)) {
                const content = fs.readFileSync(filePath, "utf-8");
                documents.push(
                    new Document({
                        pageContent: content,
                        metadata: {
                            source: file,
                            type: ext.replace(".", ""),
                        },
                    })
                );
                console.log(`Loaded text file: ${file}`);
            } else if (ext === ".pdf") {
                try {
                    const { PDFParse } = await import("pdf-parse");
                    const dataBuffer = fs.readFileSync(filePath);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const parser = new (PDFParse as any)({ data: dataBuffer });
                    const result = await parser.getText();
                    documents.push(
                        new Document({
                            pageContent: result.text,
                            metadata: {
                                source: file,
                                type: "pdf",
                            },
                        })
                    );
                    console.log(`Loaded PDF file: ${file}`);
                } catch (err) {
                    console.error(`Failed to load PDF ${file}:`, err);
                }
            }
        }
    }

    return documents;
}

/**
 * Split documents into chunks for better retrieval
 */
async function splitDocuments(documents: Document[]): Promise<Document[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n## ", "\n### ", "\n\n", "\n", " "],
    });

    return await splitter.splitDocuments(documents);
}

/**
 * Initialize or load the vector store
 */
export async function getVectorStore(): Promise<MemoryVectorStore> {
    if (vectorStore) {
        return vectorStore;
    }

    console.log("Initializing vector store...");

    // Load and process documents
    const rawDocs = await loadDocuments();

    if (rawDocs.length === 0) {
        console.log("No documents found in knowledge_base. Creating empty store.");
        vectorStore = new MemoryVectorStore(getEmbeddings());
        return vectorStore;
    }

    const splitDocs = await splitDocuments(rawDocs);
    console.log(`Split into ${splitDocs.length} chunks`);

    // Create vector store from documents
    vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        getEmbeddings()
    );

    console.log("Vector store initialized successfully!");
    return vectorStore;
}


/**
 * Refine the user query to fix typos and normalize medical terms
 */
async function refineQuery(query: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second fail-fast

    try {
        const chatModel = getChatModel(0); // 0 retries for refinement to fail fast

        const response = await chatModel.invoke([
            new HumanMessage(QUERY_REFINER_PROMPT.replace("{question}", query))
        ], { signal: controller.signal });

        const refined = response.content.toString().trim();
        console.log(`Query refined: "${query}" -> "${refined}"`);
        return refined;
    } catch (error: unknown) {
        console.error("Query refinement failed, using original query:", error);
        return query;
    }
    finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Search for relevant documents based on a query
 */
export async function searchDocuments(
    query: string,
    topK: number = 6
): Promise<Document[]> {
    // Skip refinement for very short/simple queries to save time and quota
    // OPTIMIZATION: Disabling query refinement to reduce latency
    let refinedQuery = query;
    /* 
    if (query.length > 40) {
        refinedQuery = await refineQuery(query);
    } else {
        console.log(`Skipping refinement for clear/short query: "${query}"`);
    }
    */

    const normalizedQuery = refinedQuery.toLowerCase().trim();

    // Check Cache first
    const cached = queryCache.get(normalizedQuery);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`Cache hit for query: "${normalizedQuery}"`);
        return cached.docs;
    }

    let results: Document[] = [];

    // Try Pinecone first if configured
    const isPineconeConfigured = process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "YOUR_API_KEY_HERE";

    if (isPineconeConfigured) {
        try {
            console.log("Searching in Pinecone...");
            const pineconeStore = await getPineconeStore();
            results = await pineconeStore.similaritySearch(query, topK);
        } catch (error) {
            console.error("Pinecone search failed, falling back to Local Memory Store:", error);
            // Optimization: Fallback to local store instead of failing
            try {
                const store = await getVectorStore();
                results = await store.similaritySearch(query, topK);
            } catch (localError) {
                console.error("Local Memory store fallback also failed:", localError);
            }
        }
    } else {
        console.log("Searching in Local Memory store (Pinecone not configured)...");
        try {
            const store = await getVectorStore();
            results = await store.similaritySearch(query, topK);
        } catch (error) {
            console.error("Local Memory store search failed:", error);
        }
    }

    // Hybrid Search Logic: If specific keywords (creatinine, egfr, etc) are in query,
    // ensure those documents are prioritized or pinned.
    const keywords = ["creatinine", "egfr", "gfr", "potassium", "hemodialysis", "dialysis"];
    const hasKeyword = keywords.some(k => normalizedQuery.includes(k));

    if (hasKeyword) {
        // Boost documents that contain the exact keywords
        results.sort((a, b) => {
            const aHas = keywords.some(k => a.pageContent.toLowerCase().includes(k)) ? 1 : 0;
            const bHas = keywords.some(k => b.pageContent.toLowerCase().includes(k)) ? 1 : 0;
            return bHas - aHas;
        });
    }

    // Save to cache
    queryCache.set(normalizedQuery, { docs: results, timestamp: Date.now() });

    return results;
}

/**
 * Get formatted context from search results
 */
export function formatContext(documents: Document[]): string {
    if (documents.length === 0) {
        return "No relevant information found in the knowledge base.";
    }

    return documents
        .map((doc) => {
            const source = doc.metadata.source || "Unknown";
            return `[Source: ${source}]\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
}
