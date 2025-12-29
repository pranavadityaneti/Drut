// Shared Gemini AI client for Edge Functions

const SCHEMA_HINT = `
{
  "questionText": string,
  "options": [{"text": string}, {"text": string}, {"text": string}, {"text": string}],
  "correctOptionIndex": 0 | 1 | 2 | 3,
  "timeTargets": {"jee_main": number, "cat": number, "eamcet": number},
  "fastestSafeMethod": {"exists": boolean, "preconditions": string, "steps": string[], "sanityCheck": string},
  "fullStepByStep": {"steps": string[]},
  "fsmTag": string,
  "visualDescription": string | null,
  "diagramRequired": boolean,
  "difficulty": "Easy" | "Medium" | "Hard"
}
`.trim();

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set!');
}

export async function generateContent(
    prompt: string,
    systemInstruction?: string,
    temperature = 0.3,
    model = 'gemini-2.0-flash'  // Use 2.0 for JSON generation (more reliable)
): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, maxOutputTokens: 8192 },
    };

    if (systemInstruction) {
        requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Gemini API error:', error);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Generate a diagram image using gemini-3-pro-image-preview
 * Returns base64-encoded PNG data
 */
export async function generateDiagramImage(
    visualDescription: string
): Promise<{ base64: string; mimeType: string } | null> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `Generate a clean, educational physics diagram with the following specifications:

${visualDescription}

STRICT REQUIREMENTS:
- White background (#FFFFFF)
- 4:3 aspect ratio (800x600 pixels)
- Clean line art style
- Black lines and text
- Label all components clearly
- No decorative elements
- Physics textbook quality`;

    const requestBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2,
            responseModalities: ['TEXT', 'IMAGE'],
        },
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Gemini Image API error:', error);
            return null;
        }

        const data = await response.json();
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData?.mimeType?.startsWith('image/')
        );

        if (imagePart?.inlineData) {
            return {
                base64: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            };
        }

        console.error('No image in response');
        return null;
    } catch (error) {
        console.error('generateDiagramImage error:', error);
        return null;
    }
}

/**
 * PASS 2: Verify answer independently
 */
export async function verifyAnswer(questionText: string, options: string[]): Promise<{
    matchedOptionIndex: number | null;
    isValid: boolean;
}> {
    const prompt = `Solve this physics problem and tell me which option is correct.

PROBLEM: ${questionText}

OPTIONS:
A) ${options[0]}
B) ${options[1]}  
C) ${options[2]}
D) ${options[3]}

Reply with ONLY the letter (A, B, C, or D) of the correct answer. Nothing else.`;

    try {
        // Use 2.5-flash for verification (just returns one letter, no JSON needed)
        const response = await generateContent(prompt, 'You are a physics solver. Reply with only one letter: A, B, C, or D. No explanation.', 0.1, 'gemini-2.5-flash');
        const letter = response.trim().toUpperCase().charAt(0);
        const optionMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

        if (letter in optionMap) {
            return { matchedOptionIndex: optionMap[letter], isValid: true };
        }
        return { matchedOptionIndex: null, isValid: false };
    } catch (error) {
        console.error('[VERIFY] Error:', error);
        return { matchedOptionIndex: null, isValid: false };
    }
}

export function extractJSON(text: string): string {
    // Clean thinking tags if present
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Try markdown code fence
    const fence = cleaned.match(/```json([\s\S]*?)```/i);
    if (fence) return fence[1].trim();

    const genericFence = cleaned.match(/```([\s\S]*?)```/);
    if (genericFence) return genericFence[1].trim();

    // Find array
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return cleaned.slice(firstBracket, lastBracket + 1);
    }

    // Find object
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
        return cleaned.slice(first, last + 1);
    }

    return cleaned;
}

export { SCHEMA_HINT };
