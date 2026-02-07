
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "./config";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import { PDFParse } from "pdf-parse";
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
        const parser = new PDFParse({ data: buffer });
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
 * Load documents from the file system
 */
async function loadDocuments(): Promise<Document[]> {
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
                        const parser = new PDFParse({ data: buffer });
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
    const pinecone = getPineconeClient();
    try {
        console.log(`Initializing Pinecone index: ${indexName}...`);

        // Check if index exists
        const existingIndexes = await pinecone.listIndexes();
        const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName);

        if (!indexExists) {
            console.log(`Creating index ${indexName}...`);
            await pinecone.createIndex({
                name: indexName,
                dimension: 3072, // Updated to match text-embedding-004
                metric: "cosine",
                spec: {
                    serverless: {
                        cloud: "aws",
                        region: "us-east-1"
                    }
                }
            });
            console.log("Index created. Waiting for initialization...");
            // Wait for index to be ready
            let status = await pinecone.describeIndex(indexName);
            while (status.status?.ready === false) {
                console.log("Waiting for index to be ready...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                status = await pinecone.describeIndex(indexName);
            }
        } else {
            // Check if existing index has correct dimension
            const status = await pinecone.describeIndex(indexName);
            if (status.dimension !== 3072) {
                console.log(`Dimension mismatch: expected 3072, found ${status.dimension}. Recreating index...`);
                await pinecone.deleteIndex(indexName);
                await initializePinecone(); // Restart initialization
                return;
            }
        }
        console.log("Index is ready!");

        const index = pinecone.Index(indexName);

        // Check if vector store has any vectors
        console.log("Checking index stats...");
        const stats = await index.describeIndexStats();
        console.log(`Current record count: ${stats.totalRecordCount}`);

        if (stats.totalRecordCount === 0) {
            console.log("Index is empty. Loading documents...");
            const rawDocs = await loadDocuments();
            if (rawDocs.length > 0) {
                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: 500,
                    chunkOverlap: 100,
                    separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
                });
                const docs = await splitter.splitDocuments(rawDocs);

                console.log(`Uploading ${docs.length} chunks to Pinecone...`);
                try {
                    await PineconeStore.fromDocuments(docs, getEmbeddings(), {
                        pineconeIndex: index,
                        maxConcurrency: 1, // Be very conservative
                    });
                    console.log("Upload complete!");
                } catch (err) {
                    console.error("Error during document upload to Pinecone:", err);
                    throw err;
                }
            } else {
                console.log("No documents found to upload.");
            }
        } else {
            console.log(`Index already contains ${stats.totalRecordCount} vectors. Skipping initial upload.`);
        }

        return await PineconeStore.fromExistingIndex(getEmbeddings(), {
            pineconeIndex: index,
        });

    } catch (error) {
        console.error("Error initializing Pinecone:", error);
        throw error;
    }
}

// Flag and cached store to prevent redundant initialization
let isInitialized = false;
let cachedStore: PineconeStore | null = null;

export async function getPineconeStore() {
    // Only initialize once during application lifecycle
    if (isInitialized && cachedStore) {
        return cachedStore;
    }

    // Ensure index is created and initialized with correct settings
    await initializePinecone();

    const pinecone = getPineconeClient();
    const index = pinecone.Index(indexName);

    cachedStore = await PineconeStore.fromExistingIndex(getEmbeddings(), {
        pineconeIndex: index,
    });

    isInitialized = true;
    return cachedStore;
}
