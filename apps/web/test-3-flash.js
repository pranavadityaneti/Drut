
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";

async function testModel() {
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    console.log("Testing gemini-3.0-flash...");
    try {
        const response = await client.models.generateContent({
            model: 'gemini-3.0-flash',
            contents: "Hello, are you Gemini 3.0 Flash?",
        });
        console.log("Success!");
        console.log("Response:", response.text);
    } catch (error) {
        console.error("Error with gemini-3.0-flash:", error.message);

        // meaningful error check
        if (error.message.includes("404") || error.message.includes("not found")) {
            console.log("Model gemini-3.0-flash appears to be unavailable.");
        }
    }
}

testModel();
