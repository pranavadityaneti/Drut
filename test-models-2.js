import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyAEeKi8yNY9yf0OptQq46RAUNZeKUDFNmY";
const client = new GoogleGenAI({ apiKey });

async function listModels() {
    console.log("Fetching available models...");
    const modelsToTest = [
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-002',
        'gemini-1.5-pro',
        'gemini-1.5-pro-001',
        'gemini-1.0-pro',
        'gemini-pro'
    ];

    for (const model of modelsToTest) {
        console.log(`Testing ${model}...`);
        try {
            await client.models.generateContent({
                model: model,
                contents: "Test",
            });
            console.log(`SUCCESS: ${model} is available.`);
        } catch (e) {
            console.log(`FAILED: ${model} - ` + e.message);
        }
    }
}

listModels();
