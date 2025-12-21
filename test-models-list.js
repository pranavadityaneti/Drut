
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const client = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Attempting to list models...");
        // Try to find the list method. In the new SDK it might be client.models.list()
        const models = await client.models.list();

        console.log("Available Models:");
        for await (const model of models) {
            console.log(`- ${model.name}`);
        }

    } catch (error) {
        console.error("Error listing models:", error.message);
        console.log("Trying alternative list method if any...");
    }
}

listModels();
