
# Validating PDF Parse usage in Pinecone script
# The previous errors suggested confusion about default vs named exports.
# Let's verify what 'PDFParse' actually is when imported.

import { PDFParse } from "pdf-parse";

try {
    console.log("PDFParse type:", typeof PDFParse);
    console.log("PDFParse:", PDFParse);

    // Test instantiation if it's a class
    if (typeof PDFParse === 'function') {
        try {
            const instance = new PDFParse({ data: Buffer.from("test") });
            console.log("Instantiation successful");
        } catch (e) {
            console.log("Instantiation failed:", e.message);
        }
    }
} catch (e) {
    console.error("Error referencing imported PDFParse:", e);
}
