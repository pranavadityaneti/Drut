import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

// Your working Gemini API key
const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '';

/**
 * Drut AI Thinking Modes
 * - 'speed': Low latency for real-time interactions (hints, live questions)
 * - 'deep': High reasoning for analysis tasks (post-sprint, pattern detection)
 */
export type DrutAIMode = 'speed' | 'deep';

/**
 * Model configuration based on mode
 */
interface DrutAIConfig {
    model: string;
    thinkingLevel: string;
}

/**
 * Get model and thinking configuration based on operation mode
 * 
 * HYBRID THINKING ARCHITECTURE:
 * - 'speed' mode: For user-facing real-time interactions where <2s latency is critical
 *   Uses 'low' thinking to minimize TTFT (time to first token)
 * 
 * - 'deep' mode: For async analysis where accuracy > speed
 *   Uses 'high' thinking for complex multi-datapoint reasoning
 * 
 * @param mode - 'speed' for real-time, 'deep' for analysis
 */
export const getDrutAIConfig = (mode: DrutAIMode = 'speed'): DrutAIConfig => {
    if (mode === 'speed') {
        return {
            model: 'gemini-3-flash-preview',
            thinkingLevel: 'low'
        };
    }

    // 'deep' mode for analysis
    return {
        model: 'gemini-3-flash-preview',
        thinkingLevel: 'high'
    };
};

/**
 * Get or create AI client instance using @google/genai
 * This SDK works in browsers and provides access to Gemini models
 */
export const getAiClient = (): GoogleGenAI => {
    if (client) return client;

    if (!GEMINI_API_KEY) {
        throw new Error("API key is missing. Please add VITE_GEMINI_API_KEY to your .env.local file.");
    }

    console.log('[Drut AI] Active Model: gemini-3-flash-preview');
    client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    return client;
};

/**
 * Generate content with Drut's Hybrid Thinking Architecture
 * 
 * @param prompt - The prompt to send
 * @param mode - 'speed' for real-time (low thinking), 'deep' for analysis (high thinking)
 * @param options - Additional configuration options
 */
export const generateDrutContent = async (
    prompt: string,
    mode: DrutAIMode = 'speed',
    options: {
        systemInstruction?: string;
        responseMimeType?: string;
        temperature?: number;
    } = {}
): Promise<string> => {
    const ai = getAiClient();
    const config = getDrutAIConfig(mode);

    try {
        const result = await ai.models.generateContent({
            model: config.model,
            contents: prompt,
            config: {
                systemInstruction: options.systemInstruction,
                responseMimeType: options.responseMimeType || 'text/plain',
                temperature: options.temperature ?? (mode === 'speed' ? 0.2 : 0.4),
                // Gemini 3 thinking configuration - Removed for now as thinkingConfig might not be fully supported in all client versions yet or requires specific handling
                // thinkingConfig: {
                //     thinkingLevel: config.thinkingLevel as any
                // }
            },
        });
        return result.text || '';
    } catch (error: any) {
        // Fallback Logic
        if (error.message?.includes('404') || error.message?.includes('503') || error.message?.includes('not found')) {
            console.warn('[Drut AI] Fallback triggered: using gemini-1.5-flash');
            const fallbackModel = 'gemini-1.5-flash';
            const result = await ai.models.generateContent({
                model: fallbackModel,
                contents: prompt,
                config: {
                    systemInstruction: options.systemInstruction,
                    responseMimeType: options.responseMimeType || 'text/plain',
                    temperature: options.temperature ?? 0.2,
                },
            });
            return result.text || '';
        }
        throw error;
    }
};

/**
 * Get model instance - compatible with both GenAI and Vertex AI
 * @param modelName - Model to use (default: gemini-3-flash-preview)
 * @deprecated Use getDrutAIConfig() for proper mode-based configuration
 */
export const getGeminiModel = (modelName: string = 'gemini-3-flash-preview') => {
    const client = getAiClient();
    return client;
};

