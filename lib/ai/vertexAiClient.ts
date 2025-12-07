import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

// Your working Gemini API key
const GEMINI_API_KEY = 'AIzaSyAEeKi8yNY9yf0OptQq46RAUNZeKUDFNmY';

/**
 * Get or create AI client instance using @google/genai
 * This SDK works in browsers and provides access to Gemini models
 */
export const getAiClient = (): GoogleGenAI => {
    if (client) return client;

    if (!GEMINI_API_KEY) {
        throw new Error("API key is missing.");
    }

    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    return client;
};

/**
 * Get model instance - compatible with both GenAI and Vertex AI
 * @param modelName - Model to use (default: gemini-2.0-flash-exp)
 */
export const getGeminiModel = (modelName: string = 'gemini-2.0-flash-exp') => {
    const client = getAiClient();
    return client;
};
