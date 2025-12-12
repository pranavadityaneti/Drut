// Shared Gemini AI client for Edge Functions
// Uses Google GenAI API (API key based) instead of Vertex AI (service account based)

const SCHEMA_HINT = `
{
  "questionText": string,
  "options": [
    { "text": string },
    { "text": string },
    { "text": string },
    { "text": string }
  ],
  "correctOptionIndex": 0 | 1 | 2 | 3,
  "timeTargets": { "jee_main": number, "cat": number, "eamcet": number },
  "fastestSafeMethod": {
    "exists": boolean,
    "preconditions": string,
    "steps": string[],
    "sanityCheck": string
  },
  "fullStepByStep": { "steps": string[] },
  "fsmTag": string // REQUIRED: lowercase kebab-case pattern tag (e.g., "ratio-inverse-prop", "time-work-lcm-method")
}
`.trim();

// Google GenAI API key - same as used in frontend
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyAEeKi8yNY9yf0OptQq46RAUNZeKUDFNmY';

/**
 * Call Google GenAI API (simpler than Vertex AI, uses API key)
 */
export async function generateContent(
    prompt: string,
    systemInstruction?: string,
    temperature = 0.3
): Promise<string> {
    const model = 'gemini-2.0-flash-exp';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const contents = [
        {
            role: 'user',
            parts: [{ text: prompt }],
        },
    ];

    const requestBody: any = {
        contents,
        generationConfig: {
            temperature,
            maxOutputTokens: 8192,
        },
    };

    if (systemInstruction) {
        requestBody.systemInstruction = {
            parts: [{ text: systemInstruction }],
        };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
}

/**
 * Extract JSON from response (handles code fences)
 */
export function extractJSON(text: string): string {
    // Try markdown code fence first
    const fence = text.match(/```json([\s\S]*?)```/i);
    if (fence) return fence[1].trim();

    // Try to find array
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return text.slice(firstBracket, lastBracket + 1);
    }

    // Try to find object
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
        return text.slice(first, last + 1);
    }

    return text;
}

export { SCHEMA_HINT };
