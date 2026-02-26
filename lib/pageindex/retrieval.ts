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
    if (files.length === 0) return [];

    try {
        // Step 1: Load all trees from the KB folder
        const kbEntries = files.map(file => {
            const filePath = path.join(PAGEINDEX_KB_PATH, file);
            const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            return {
                file,
                content,
                tree: content.structure as PageIndexNode[]
            };
        });

        // Step 2: Perform a SINGLE bulk reasoning search via the Python API
        // This takes N files and makes 1 LLM call instead of N LLM calls.
        const allTrees = kbEntries.map(e => e.tree);
        const searchResult = await pageIndexClient.searchBulk(query, allTrees);

        // Step 3: Extract the text from the identified nodes across all matches
        const allRelevantDocs: Document[] = [];

        for (const match of searchResult.matches) {
            const entry = kbEntries[match.doc_index];
            if (!entry) continue;

            const matchedNodes = pageIndexClient.findNodesByIds(entry.tree, match.node_list);

            const docs = matchedNodes.map(node => new Document({
                pageContent: node.text || node.summary || "",
                metadata: {
                    source: entry.content.doc_name || entry.file.replace(".json", ""),
                    title: node.title,
                    node_id: node.node_id,
                    pages: `${node.start_index}-${node.end_index}`,
                    thinking: searchResult.thinking
                }
            }));
            allRelevantDocs.push(...docs);
        }

        return allRelevantDocs;
    } catch (error) {
        console.error(`Error in bulk searchPageIndex:`, error);
        return [];
    }
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
