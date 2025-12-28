
import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function resolveGeminiApiKey(): string | undefined {
  // Vite exposes env vars via import.meta.env in browser, process.env in Node
  // vite.config.ts loads GEMINI_API_KEY from .env and exposes it as process.env.GEMINI_API_KEY
  const apiKey = 
    (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||  // Vite browser env (if needed)
    process.env.GEMINI_API_KEY ||                        // Node/server env
    process.env.API_KEY;                                 // Fallback for compatibility

  // Trim whitespace in case .env file has trailing spaces/newlines
  return apiKey?.trim();
}

export const getAiClient = () => {
  if (client) return client;

  const apiKey = resolveGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set GEMINI_API_KEY in your .env file.");
  }

  // Debug: Log first 10 chars to verify key is being read (remove after debugging)
  console.log('[DEBUG] API Key loaded:', apiKey.substring(0, 10) + '...', 'Length:', apiKey.length);

  client = new GoogleGenAI({ apiKey });
  return client;
};
