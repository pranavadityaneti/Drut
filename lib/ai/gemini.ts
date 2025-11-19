
import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

const GEMINI_API_KEY = "AIzaSyAEeKi8yNY9yf0OptQq46RAUNZeKUDFNmY";

export const getAiClient = () => {
  if (client) return client;

  // Prioritize the hardcoded key for this session, fallback to env if needed
  const apiKey = GEMINI_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }

  client = new GoogleGenAI({ apiKey });
  return client;
};
