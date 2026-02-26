export interface PageIndexNode {
    title: string;
    node_id: string;
    start_index: number;
    end_index: number;
    summary: string;
    text?: string;
    nodes?: PageIndexNode[];
}

export interface PageIndexResult {
    doc_name: string;
    structure: PageIndexNode[];
}

export interface SearchResult {
    thinking: string;
    node_list: string[];
}

export class PageIndexClient {
    private baseUrl: string;

    constructor(baseUrl?: string) {
        if (baseUrl) {
            this.baseUrl = baseUrl;
        } else if (process.env.NEXT_PUBLIC_BASE_URL) {
            // Priority 1: User defined environment variable
            this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        } else if (process.env.VERCEL_URL) {
            // Priority 2: Vercel environment
            this.baseUrl = `https://${process.env.VERCEL_URL}`;
        } else {
            // Default 3: Localhost development (explicitly define URL for Node.js fetch)
            this.baseUrl = "http://localhost:8000"; // Assuming the Python API runs on 8000
        }
    }

    async indexPdf(file: Buffer, fileName: string): Promise<PageIndexResult> {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(file)], { type: 'application/pdf' });
        formData.append('file', blob, fileName);

        const response = await fetch(`${this.baseUrl}/api/python/index-pdf`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`PageIndex indexing failed: ${error}`);
        }

        return await response.json();
    }

    async search(query: string, tree: PageIndexNode[]): Promise<SearchResult> {
        return this.searchBulk(query, [tree]).then(res => ({
            thinking: res.thinking,
            node_list: res.matches[0]?.node_list || []
        }));
    }

    async searchBulk(query: string, trees: PageIndexNode[][]): Promise<{ thinking: string, matches: { doc_index: number, node_list: string[] }[] }> {
        const response = await fetch(`${this.baseUrl}/api/python/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                trees_json: JSON.stringify(trees)
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`PageIndex bulk search failed: ${error}`);
        }

        return await response.json();
    }

    /**
     * Helper to find nodes by ID in the tree
     */
    findNodesByIds(tree: PageIndexNode[], ids: string[]): PageIndexNode[] {
        const results: PageIndexNode[] = [];
        const find = (nodes: PageIndexNode[]) => {
            if (!ids || !Array.isArray(ids)) return;
            for (const node of nodes) {
                if (ids.includes(node.node_id)) {
                    results.push(node);
                }
                if (node.nodes && node.nodes.length > 0) {
                    find(node.nodes);
                }
            }
        };
        find(tree);
        return results;
    }
}

export const pageIndexClient = new PageIndexClient();
