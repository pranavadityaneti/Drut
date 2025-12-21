import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";
if (!process.env.GEMINI_API_KEY) {
    console.warn("Warning: GEMINI_API_KEY not set in environment. Using placeholder.");
}
const client = new GoogleGenAI({ apiKey });

async function testGen() {
    console.log("Testing Gemini 2.0 Flash Exp...");
    try {
        const res = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: "Hello, are you working? Reply with 'Yes, I am functional.'",
        });
        console.log("Response:", res.text);
    } catch (error) {
        console.error("Error:", error);
    }
}

testGen();
