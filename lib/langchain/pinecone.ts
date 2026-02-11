
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "./config";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import mammoth from "mammoth";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");

const indexName = process.env.PINECONE_INDEX_NAME || "kidney-rag-chatbot";

/**
 * Process a file buffer based on its extension
 */
export async function processFileBuffer(buffer: Buffer, filename: string): Promise<Document[]> {
    const ext = path.extname(filename).toLowerCase();
    const documents: Document[] = [];

    if ([".txt", ".md"].includes(ext)) {
        const content = buffer.toString("utf-8");
        documents.push(
            new Document({
                pageContent: content,
                metadata: { source: filename, type: ext.replace(".", "") },
            })
        );
    } else if (ext === ".pdf") {
        const { PDFParse } = await import("pdf-parse");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parser = new (PDFParse as any)({ data: buffer });
        const result = await parser.getText();
        documents.push(
            new Document({
                pageContent: result.text,
                metadata: { source: filename, type: "pdf" },
            })
        );
    } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({ buffer });
        documents.push(
            new Document({
                pageContent: result.value,
                metadata: { source: filename, type: "docx" },
            })
        );
    }

    if (documents.length === 0) return [];

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500, // Reduced from 1000 for sentence-level granularity
        chunkOverlap: 100, // Reduced overlap
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""], // Explicitly prioritize sentence endings
    });

    return await splitter.splitDocuments(documents);
}

/**
 * Process raw text into split documents
 */
export async function processRawText(text: string, sourceLabel: string): Promise<Document[]> {
    const doc = new Document({
        pageContent: text,
        metadata: { source: sourceLabel, type: "manual_entry" },
    });

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    });

    return await splitter.splitDocuments([doc]);
}

/**
 * Load all documents from the file system
 */
export async function loadLocalDocuments(): Promise<Document[]> {
    const documents: Document[] = [];

    if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
        console.log("Knowledge base directory not found.");
        return documents;
    }

    const files = fs.readdirSync(KNOWLEDGE_BASE_PATH);

    for (const file of files) {
        const filePath = path.join(KNOWLEDGE_BASE_PATH, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();
            const buffer = fs.readFileSync(filePath);

            try {
                if ([".txt", ".md", ".pdf", ".docx"].includes(ext)) {
                    // We use a simplified version for initial load since we want to return full docs before splitting
                    // but the logic is similar
                    if (ext === ".docx") {
                        const result = await mammoth.extractRawText({ buffer });
                        documents.push(new Document({ pageContent: result.value, metadata: { source: file, type: "docx" } }));
                        console.log(`Loaded Word file: ${file}`);
                    } else if (ext === ".pdf") {
                        const { PDFParse } = await import("pdf-parse");
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const parser = new (PDFParse as any)({ data: buffer });
                        const result = await parser.getText();
                        documents.push(new Document({ pageContent: result.text, metadata: { source: file, type: "pdf" } }));
                        console.log(`Loaded PDF file: ${file}`);
                    } else {
                        documents.push(new Document({ pageContent: buffer.toString("utf-8"), metadata: { source: file, type: ext.replace(".", "") } }));
                        console.log(`Loaded text file: ${file}`);
                    }
                }
            } catch (err) {
                console.error(`Failed to load ${file}:`, err);
            }
        }
    }
    return documents;
}

/**
 * Sync all local documents to Pinecone
 */
export async function syncKnowledgeBase(): Promise<{ totalChunks: number; fileCount: number }> {
    const rawDocs = await loadLocalDocuments();
    if (rawDocs.length === 0) return { totalChunks: 0, fileCount: 0 };

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    });

    const splitDocs = await splitter.splitDocuments(rawDocs);
    const pineconeStore = await getPineconeStore();

    // In a real production app, we might want to clear the index first or use namespaces 
    // to avoid duplicates. For now, we'll just add them.
    await pineconeStore.addDocuments(splitDocs);

    return {
        totalChunks: splitDocs.length,
        fileCount: rawDocs.length
    };
}

// Helper to get Pinecone client (ensures process.env is ready)
function getPineconeClient() {
    if (!process.env.PINECONE_API_KEY) {
        throw new Error("PINECONE_API_KEY is not defined in environment variables");
    }
    return new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    });
}

/**
 * Initialize Pinecone Index and upload documents if empty
 */
export async function initializePinecone() {
    // OPTIMIZATION: Skip the expensive listIndexes() call on every startup.
    // We assume the index exists to reduce latency.
    /*
    const pinecone = getPineconeClient();
    try {
        const existingIndexes = await pinecone.listIndexes();
        // ... (original creation logic)
    } catch (error) {
        console.error("Error initializing Pinecone:", error);
    }
    */
    // console.log("Assuming Pinecone index is ready for speed.");
    return true;
}

// Flag and cached store to prevent redundant initialization
let isIndexReady = false;
let isInitialized = false;
let cachedStore: PineconeStore | null = null;

export async function getPineconeStore() {
    // Only initialize once during application lifecycle
    if (isInitialized && cachedStore) {
        return cachedStore;
    }

    // Ensure index is created (will not block for readiness)
    if (!isIndexReady) {
        isIndexReady = await initializePinecone();
    }

    if (!isIndexReady) {
        console.warn("Pinecone index is not ready yet. Search will be disabled.");
        throw new Error("Pinecone index not ready");
    }

    const pinecone = getPineconeClient();
    const index = pinecone.Index(indexName);

    cachedStore = await PineconeStore.fromExistingIndex(getEmbeddings(), {
        pineconeIndex: index,
    });

    isInitialized = true;
    return cachedStore;
}
