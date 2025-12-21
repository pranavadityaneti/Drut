
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE";
const client = new GoogleGenAI({ apiKey });

async function testModel() {
    console.log("Testing gemini-3-flash-preview...");
    try {
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Hello, are you Gemini 3 Flash? Please reply with your model name if you know it.",
        });
        console.log("Success!");
        console.log("Response:", response.text);
    } catch (error) {
        console.error("Error with gemini-3-flash-preview:", error.message);
    }
}

testModel();
