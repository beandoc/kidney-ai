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

// Simple Query Cache replaced by LRU Cache
import { LRUCache } from "lru-cache";

const queryCache = new LRUCache<string, { docs: Document[], timestamp: number }>({
    max: 500, // Maximum number of cached queries
    ttl: 1000 * 60 * 60, // 1 hour TTL
});

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
export async function refineQuery(query: string): Promise<string> {
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

