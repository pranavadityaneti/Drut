import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyAEeKi8yNY9yf0OptQq46RAUNZeKUDFNmY";
const client = new GoogleGenAI({ apiKey });

async function listModels() {
    console.log("Fetching available models...");
    try {
        // The SDK might not have a direct listModels helper on the client root in this version,
        // but usually it's under models.
        // If not, we can try a simple generation with a known old model to see if it works,
        // or use the REST API via fetch if SDK fails.

        // Let's try to generate with 'gemini-1.5-flash' first to see if it works here.
        console.log("Testing gemini-1.5-flash...");
        try {
            await client.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: "Test",
            });
            console.log("SUCCESS: gemini-1.5-flash is available.");
        } catch (e) {
            console.log("FAILED: gemini-1.5-flash - " + e.message);
        }

        console.log("Testing gemini-1.5-flash-001...");
        try {
            await client.models.generateContent({
                model: 'gemini-1.5-flash-001',
                contents: "Test",
            });
            console.log("SUCCESS: gemini-1.5-flash-001 is available.");
        } catch (e) {
            console.log("FAILED: gemini-1.5-flash-001 - " + e.message);
        }

        console.log("Testing gemini-2.0-flash-exp...");
        try {
            await client.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: "Test",
            });
            console.log("SUCCESS: gemini-2.0-flash-exp is available.");
        } catch (e) {
            console.log("FAILED: gemini-2.0-flash-exp - " + e.message);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
