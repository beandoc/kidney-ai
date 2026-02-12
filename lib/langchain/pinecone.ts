
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
 * Recursively flatten a JSON object into readable text for embedding.
 * Extracts all string values and joins them with newlines.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenJsonToText(data: any, prefix = ""): string {
    const lines: string[] = [];

    if (typeof data === 'string') {
        return data;
    } else if (Array.isArray(data)) {
        for (const item of data) {
            lines.push(flattenJsonToText(item, prefix));
        }
    } else if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
            const label = prefix ? `${prefix} > ${key}` : key;
            if (typeof value === 'string') {
                lines.push(`${label}: ${value}`);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                lines.push(`${label}: ${String(value)}`);
            } else {
                lines.push(flattenJsonToText(value, label));
            }
        }
    }

    return lines.filter(l => l.trim().length > 0).join('\n');
}

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
    } else if (ext === ".json") {
        try {
            const raw = buffer.toString("utf-8");
            const jsonData = JSON.parse(raw);
            // Flatten JSON into readable text
            const text = flattenJsonToText(jsonData);
            documents.push(
                new Document({
                    pageContent: text,
                    metadata: { source: filename, type: "json" },
                })
            );
            console.log(`Loaded JSON file: ${filename} (${text.length} chars)`);
        } catch (error) {
            console.error("JSON Parsing Error:", error);
            throw new Error(`Failed to parse JSON ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        }
    } else if (ext === ".pdf") {
        try {
            // pdf-parse v2.x uses a class-based API
            const { PDFParse } = await import("pdf-parse");
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            documents.push(
                new Document({
                    pageContent: result.text,
                    metadata: { source: filename, type: "pdf" },
                })
            );
        } catch (error) {
            console.error("PDF Parsing Error:", error);
            throw new Error(`Failed to parse PDF ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        }
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
        chunkSize: 1000, // Balanced: good context per chunk, fewer total chunks for faster indexing
        chunkOverlap: 150,
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    });

    const splitDocs = await splitter.splitDocuments(documents);

    // Filter out empty or whitespace-only chunks that cause 0-dimension embedding errors
    const validDocs = splitDocs.filter(doc => doc.pageContent.trim().length > 10);
    console.log(`processFileBuffer: Split into ${splitDocs.length} chunks, ${validDocs.length} valid (filtered ${splitDocs.length - validDocs.length} empty/tiny chunks)`);

    return validDocs;
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
        chunkSize: 1000,
        chunkOverlap: 150,
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    });

    const splitDocs = await splitter.splitDocuments([doc]);

    // Filter out empty or whitespace-only chunks that cause 0-dimension embedding errors
    const validDocs = splitDocs.filter(doc => doc.pageContent.trim().length > 10);
    console.log(`Split into ${splitDocs.length} chunks, ${validDocs.length} valid (filtered ${splitDocs.length - validDocs.length} empty/tiny chunks)`);

    return validDocs;
}

/**
 * Load documents from the file system
 */
export async function loadLocalDocuments(specificFile?: string): Promise<Document[]> {
    const documents: Document[] = [];

    if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
        console.log("Knowledge base directory not found.");
        return documents;
    }

    const files = specificFile
        ? [specificFile].filter(f => fs.existsSync(path.join(KNOWLEDGE_BASE_PATH, f)))
        : fs.readdirSync(KNOWLEDGE_BASE_PATH);

    for (const file of files) {
        const filePath = path.join(KNOWLEDGE_BASE_PATH, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();
            const buffer = fs.readFileSync(filePath);

            try {
                if ([".txt", ".md", ".pdf", ".docx", ".json"].includes(ext)) {
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
                    } else if (ext === ".json") {
                        const raw = buffer.toString("utf-8");
                        const jsonData = JSON.parse(raw);
                        const text = flattenJsonToText(jsonData);
                        documents.push(new Document({ pageContent: text, metadata: { source: file, type: "json" } }));
                        console.log(`Loaded JSON file: ${file}`);
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
export async function syncKnowledgeBase(
    onProgress?: (info: { batch: number; totalBatches: number; chunksIndexed: number; totalChunks: number; percent: number; status?: string }) => void,
    specificFile?: string
): Promise<{ totalChunks: number; fileCount: number }> {
    let rawDocs = await loadLocalDocuments(specificFile);
    if (rawDocs.length === 0) return { totalChunks: 0, fileCount: 0 };

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 150,
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    });

    const splitDocs = await splitter.splitDocuments(rawDocs);

    // Filter out empty/tiny chunks
    const validDocs = splitDocs.filter(doc => doc.pageContent.trim().length > 10);
    console.log(`Sync: ${validDocs.length} valid chunks from ${rawDocs.length} files (filtered ${splitDocs.length - validDocs.length} empty)`);

    const pineconeStore = await getPineconeStore();

    const BATCH_SIZE = 100; // MUCH more efficient for Quota (1000 chunks = 10 calls)
    const DELAY_MS = 2000;   // Safe delay between large batches
    const MAX_RETRIES = 3;
    const totalBatches = Math.ceil(validDocs.length / BATCH_SIZE);

    onProgress?.({ batch: 0, totalBatches, chunksIndexed: 0, totalChunks: validDocs.length, percent: 0, status: `Starting: ${validDocs.length} chunks from ${rawDocs.length} files` });

    for (let i = 0; i < validDocs.length; i += BATCH_SIZE) {
        const batch = validDocs.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        let retries = 0;
        while (retries <= MAX_RETRIES) {
            try {
                await pineconeStore.addDocuments(batch);
                const chunksIndexed = i + batch.length;
                const percent = Math.round((chunksIndexed / validDocs.length) * 100);
                onProgress?.({ batch: batchNum, totalBatches, chunksIndexed, totalChunks: validDocs.length, percent });
                if (batchNum % 10 === 1) {
                    console.log(`  Sync batch ${batchNum}/${totalBatches} — ${percent}%`);
                }
                break;
            } catch (batchError) {
                retries++;
                if (retries > MAX_RETRIES) {
                    console.error(`  Sync batch ${batchNum} failed after ${MAX_RETRIES} retries:`, batchError);
                    throw batchError;
                }
                const backoff = DELAY_MS * Math.pow(2, retries - 1);
                onProgress?.({ batch: batchNum, totalBatches, chunksIndexed: i, totalChunks: validDocs.length, percent: Math.round((i / validDocs.length) * 100), status: `Retry ${retries} for batch ${batchNum}...` });
                console.warn(`  Sync batch ${batchNum} failed, retrying in ${backoff}ms...`);
                await new Promise(r => setTimeout(r, backoff));
            }
        }

        if (i + BATCH_SIZE < validDocs.length) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    return {
        totalChunks: validDocs.length,
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
    const pc = getPineconeClient();
    try {
        const index = await pc.describeIndex(indexName);

        // Gemini Embedding 001 is 768. If index is 3072 (OpenAI size), we MUST recreate it.
        if (index.dimension !== 768) {
            console.log(`Dimension mismatch: Index is ${index.dimension}, Gemini needs 768. Recreating...`);
            await pc.deleteIndex(indexName);
            // Wait for deletion
            await new Promise(r => setTimeout(r, 5000));
            await pc.createIndex({
                name: indexName,
                dimension: 768,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            console.log("Index recreated with 768 dimensions.");
            return true;
        }
        return true;
    } catch (error) {
        // Index doesn't exist, create it
        try {
            await pc.createIndex({
                name: indexName,
                dimension: 768,
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            return true;
        } catch (createErr) {
            console.error("Error creating Pinecone index:", createErr);
            return false;
        }
    }
}

// Flag and cached store to prevent redundant initialization
let isIndexReady = false;
let isInitialized = false;
let cachedStore: PineconeStore | null = null;

export async function getPineconeStore() {
    // Force re-initialization once if it's the first call in this process
    if (!isIndexReady) {
        isIndexReady = await initializePinecone();
        isInitialized = false; // Reset initialized flag to force store recreation
    }

    if (isInitialized && cachedStore) {
        return cachedStore;
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
