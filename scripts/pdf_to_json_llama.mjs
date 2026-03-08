import fs from "fs";
import path from "path";
import FormData from "form-data";
import axios from "axios";

async function parsePdf(pdfPath) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(pdfPath));

    console.log(`Uploading ${path.basename(pdfPath)}...`);
    const uploadRes = await axios.post('https://api.cloud.llamaindex.ai/api/parsing/upload', formData, {
        headers: {
            ...formData.getHeaders(),
            'Authorization': 'Bearer 8197fc6055134fb1a0d2cee5e39de142'
        }
    });
    const uploadData = uploadRes.data;
    if (!uploadData.id) throw new Error("Upload failed: " + JSON.stringify(uploadData));

    let status = 'PENDING';
    while (status === 'PENDING') {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await axios.get(`https://api.cloud.llamaindex.ai/api/parsing/job/${uploadData.id}`, {
            headers: { 'Authorization': 'Bearer 8197fc6055134fb1a0d2cee5e39de142' }
        });
        const statusData = statusRes.data;
        status = statusData.status;
        process.stdout.write(".");
        if (status === 'ERROR') throw new Error("Job failed: " + JSON.stringify(statusData));
    }
    console.log("\nDone parsing!");

    const resultRes = await axios.get(`https://api.cloud.llamaindex.ai/api/parsing/job/${uploadData.id}/result/markdown`, {
        headers: { 'Authorization': 'Bearer 8197fc6055134fb1a0d2cee5e39de142' }
    });
    return resultRes.data.markdown;
}

async function processPdf(pdfPath) {
    const filename = path.basename(pdfPath);
    console.log(`\n--- Processing ${filename} ---`);
    const markdown = await parsePdf(pdfPath);

    const lines = markdown.split("\n");
    const sections = [];
    let currentSection = "Executive Summary";
    let currentContent = [];

    let pageCount = 1;
    for (const line of lines) {
        if (line.match(/^#+\s+(.*)/)) {
            if (currentContent.length > 0 && currentContent.join("").trim().length > 0) {
                sections.push({
                    section: currentSection || "Introduction",
                    content: currentContent.join("\n").trim(),
                    page: pageCount++,
                    source: filename
                });
            }
            currentSection = line.replace(/^#+\s+/, "").trim();
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentContent.length > 0 && currentContent.join("").trim().length > 0) {
        sections.push({
            section: currentSection || "Introduction",
            content: currentContent.join("\n").trim(),
            page: pageCount,
            source: filename
        });
    }

    const outName = filename.replace(".pdf", ".json");
    const outputPath = path.join(process.cwd(), "knowledge_base", outName);
    const pageindexDir = path.join(process.cwd(), "knowledge_base", "pageindex");
    if (!fs.existsSync(pageindexDir)) {
        fs.mkdirSync(pageindexDir, { recursive: true });
    }
    const pageindexPath = path.join(pageindexDir, outName);

    fs.writeFileSync(outputPath, JSON.stringify(sections, null, 2));
    fs.writeFileSync(pageindexPath, JSON.stringify(sections, null, 2));
    console.log(`Saved ${sections.length} sections to ${outName}`);
}

async function main() {
    const pdfs = [
        "/Users/sachinsrivastava/Downloads/KDIGO-2012-AKI-Guideline-English.pdf",
        "/Users/sachinsrivastava/Downloads/Obsidian Vault/KDIGO_2024_Lupus_Nephritis_Guideline.pdf",
        "/Users/sachinsrivastava/Downloads/Obsidian Vault/KDIGO-2024-ANCA-Vasculitis-Guideline-Executive-Summary.pdf"
    ];

    for (const pdf of pdfs) {
        try {
            if (fs.existsSync(pdf)) {
                await processPdf(pdf);
            } else {
                console.log(`Skipping (not found): ${pdf}`);
            }
        } catch (e) {
            console.error(`Error processing ${pdf}:`, e);
        }
    }
}

main().catch(console.error);
