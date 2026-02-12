/**
 * Browser-side PDF preprocessor for the admin panel.
 * Uses pdf.js to extract text from PDFs and structure it into sections.
 * This runs entirely in the browser before uploading to the server.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

interface PDFSection {
    section: string;
    content: string;
    page: number;
    source: string;
}

/**
 * Detect if a line is likely a header based on heuristics
 */
function isLikelyHeader(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 200) return false;

    // Common header patterns
    if (/^(Chapter|Section|CHAPTER|SECTION)\s+\d/.test(trimmed)) return true;
    if (/^\d+\.\d*\s+[A-Z]/.test(trimmed)) return true;
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && trimmed.length < 150) return true;
    if (/^(INTRODUCTION|ABSTRACT|CONCLUSION|METHODS|RESULTS|DISCUSSION|REFERENCES|SUMMARY|BACKGROUND|RATIONALE|RECOMMENDATIONS)/i.test(trimmed)) return true;

    return false;
}

/**
 * Split long text at sentence boundaries
 */
function splitLongText(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let current: string[] = [];
    let currentLen = 0;

    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
        if (currentLen + sentence.length > maxLength && current.length > 0) {
            chunks.push(current.join(' '));
            current = [sentence];
            currentLen = sentence.length;
        } else {
            current.push(sentence);
            currentLen += sentence.length + 1;
        }
    }

    if (current.length > 0) {
        chunks.push(current.join(' '));
    }

    return chunks;
}

/**
 * Process a PDF file in the browser and return structured JSON sections
 */
export async function preprocessPDFInBrowser(
    file: File,
    onProgress?: (page: number, total: number) => void
): Promise<PDFSection[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    const sections: PDFSection[] = [];
    let currentSection: string | null = null;
    let currentContent: string[] = [];
    let currentPage = 1;
    const MIN_SECTION_LENGTH = 50;
    const MAX_SECTION_LENGTH = 3000;

    const flushSection = () => {
        if (currentContent.length > 0) {
            const content = currentContent.join('\n').trim();
            if (content.length >= MIN_SECTION_LENGTH) {
                if (content.length > MAX_SECTION_LENGTH) {
                    const chunks = splitLongText(content, MAX_SECTION_LENGTH);
                    chunks.forEach((chunk, i) => {
                        sections.push({
                            section: `${currentSection || 'Content'} (Part ${i + 1})`,
                            content: chunk.trim(),
                            page: currentPage,
                            source: file.name
                        });
                    });
                } else {
                    sections.push({
                        section: currentSection || 'Content',
                        content,
                        page: currentPage,
                        source: file.name
                    });
                }
            }
            currentContent = [];
        }
    };

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (onProgress) onProgress(pageNum, totalPages);

        // Yield to browser every 5 pages to keep UI responsive
        if (pageNum % 5 === 0) {
            await new Promise(r => setTimeout(r, 0));
        }

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Group text items by their y-position to form lines
        const lineMap = new Map<number, string[]>();
        for (const item of textContent.items) {
            if ('str' in item && item.str.trim()) {
                const y = Math.round(('transform' in item ? item.transform[5] : 0) * 10) / 10;
                if (!lineMap.has(y)) lineMap.set(y, []);
                lineMap.get(y)!.push(item.str);
            }
        }

        // Sort by y position (top to bottom = descending y in PDF coordinates)
        const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

        for (const y of sortedYs) {
            const lineText = lineMap.get(y)!.join(' ').trim();
            if (!lineText) continue;

            if (isLikelyHeader(lineText)) {
                flushSection();
                currentSection = lineText;
                currentPage = pageNum;
            } else {
                currentContent.push(lineText);
            }
        }
    }

    // Flush the last section
    flushSection();

    return sections;
}

/**
 * Convert structured sections back to a JSON Blob for upload
 */
export function sectionsToJsonBlob(sections: PDFSection[]): Blob {
    const json = JSON.stringify(sections, null, 2);
    return new Blob([json], { type: 'application/json' });
}
