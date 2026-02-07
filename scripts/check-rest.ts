import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function checkRest() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Status: " + response.status);
        if (data.models) {
            console.log("Models and methods:");
            data.models.forEach((m: any) => {
                const methods = m.supportedMethods ? m.supportedMethods.join(", ") : "none";
                console.log(`${m.name}: ${methods}`);
            });
        } else {
            console.log("No models field in response:");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Fetch failed: " + e);
    }
}

checkRest();
