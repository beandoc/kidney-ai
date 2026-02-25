import * as fs from "fs";
import * as path from "path";
import { PageIndexClient, PageIndexNode, pageIndexClient } from "./client";
import { Document } from "@langchain/core/documents";

const PAGEINDEX_KB_PATH = path.join(process.cwd(), "knowledge_base", "pageindex");

export async function searchPageIndex(query: string): Promise<Document[]> {
    if (!fs.existsSync(PAGEINDEX_KB_PATH)) {
        console.warn("PageIndex knowledge base not found at", PAGEINDEX_KB_PATH);
        return [];
    }

    const files = fs.readdirSync(PAGEINDEX_KB_PATH).filter(f => f.endsWith(".json"));
    const allRelevantDocs: Document[] = [];

    for (const file of files) {
        try {
            const filePath = path.join(PAGEINDEX_KB_PATH, file);
            const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            const tree = content.structure as PageIndexNode[];

            // Perform reasoning search via the Python API
            const searchResult = await pageIndexClient.search(query, tree);

            // Extract the text from the identified nodes
            const matchedNodes = pageIndexClient.findNodesByIds(tree, searchResult.node_list);

            for (const node of matchedNodes) {
                allRelevantDocs.push(new Document({
                    pageContent: node.text || node.summary || "",
                    metadata: {
                        source: content.doc_name || file.replace(".json", ""),
                        title: node.title,
                        node_id: node.node_id,
                        pages: `${node.start_index}-${node.end_index}`,
                        thinking: searchResult.thinking // Optional: include reasoning in metadata
                    }
                }));
            }
        } catch (error) {
            console.error(`Error searching through ${file}:`, error);
        }
    }

    return allRelevantDocs;
}

export function formatPageIndexContext(documents: Document[]): string {
    if (documents.length === 0) {
        return "No relevant information found in the Kidney Health Guidelines.";
    }

    return documents
        .map((doc) => {
            const source = doc.metadata.source || "Unknown";
            const title = doc.metadata.title ? ` - ${doc.metadata.title}` : "";
            const pages = doc.metadata.pages ? ` (Pages: ${doc.metadata.pages})` : "";
            return `[Source: ${source}${title}${pages}]\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
}
