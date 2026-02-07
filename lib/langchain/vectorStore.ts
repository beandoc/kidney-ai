import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "./config";
import * as fs from "fs";
import * as path from "path";
import { PDFParse } from "pdf-parse";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");
const VECTOR_STORE_PATH = path.join(process.cwd(), ".vectorstore");

// In-memory store for runtime (will be populated from files)
let vectorStore: MemoryVectorStore | null = null;

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
                    const dataBuffer = fs.readFileSync(filePath);
                    const parser = new PDFParse({ data: dataBuffer });
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

import { getPineconeStore, initializePinecone } from "./pinecone";

/**
 * Search for relevant documents based on a query
 */
export async function searchDocuments(
    query: string,
    topK: number = 4
): Promise<Document[]> {
    // Try Pinecone first if configured
    if (process.env.PINECONE_API_KEY && process.env.PINECONE_API_KEY !== "YOUR_API_KEY_HERE") {
        try {
            console.log("Searching in Pinecone...");
            const pineconeStore = await getPineconeStore();
            return await pineconeStore.similaritySearch(query, topK);
        } catch (error) {
            console.error("Pinecone search failed, falling back to Memory store:", error);
        }
    }

    // Fallback to Memory Store
    console.log("Searching in Memory store...");
    const store = await getVectorStore();
    const results = await store.similaritySearch(query, topK);
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
        .map((doc, index) => {
            const source = doc.metadata.source || "Unknown";
            return `[Source: ${source}]\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
}
