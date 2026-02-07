
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { getEmbeddings } from "./config";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge_base");


const indexName = process.env.PINECONE_INDEX_NAME || "kidney-rag-chatbot";

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

            if ([".txt", ".md"].includes(ext)) {
                const content = fs.readFileSync(filePath, "utf-8");
                documents.push(
                    new Document({
                        pageContent: content,
                        metadata: { source: file, type: ext.replace(".", "") },
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
                            metadata: { source: file, type: "pdf" },
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
                dimension: 768, // Gemini embedding dimension
                metric: "cosine",
                spec: {
                    serverless: {
                        cloud: "aws",
                        region: "us-east-1"
                    }
                }
            });
            console.log("Index created. Waiting for initialization...");
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for index to be ready
        }

        // Wait for index to be ready (more robust check)
        let status = await pinecone.describeIndex(indexName);
        while (status.status?.ready === false) {
            console.log("Waiting for index to be ready...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            status = await pinecone.describeIndex(indexName);
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
                    chunkSize: 1000,
                    chunkOverlap: 200,
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

export async function getPineconeStore() {
    const pinecone = getPineconeClient();
    const index = pinecone.Index(indexName);
    return await PineconeStore.fromExistingIndex(getEmbeddings(), {
        pineconeIndex: index,
    });
}
