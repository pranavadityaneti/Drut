// Force Update: v2
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
    model = 'gemini-3-flash-preview'
): Promise<string> {
    const endpoint = (modelName: string) => `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    let currentModel = model;

    // Config with explicit JSON mode
    const getRequestBody = (mName: string) => ({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
        },
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {})
    });

    const maxRetries = 3;
    let lastError: Error | null = null;
    let fallbackTriggered = false;

    // Outer loop for fallback
    while (true) {
        // Inner loop for retries on same model
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(endpoint(currentModel), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(getRequestBody(currentModel)),
                });

                if (!response.ok) {
                    const errorText = await response.text();

                    // Check for fallback conditions (404 or 503)
                    if ((response.status === 404 || response.status === 503 || response.status === 500) && !fallbackTriggered && currentModel === 'gemini-3-flash-preview') {
                        throw new Error('FALLBACK_NEEDED');
                    }

                    console.error(`Gemini API error (${currentModel} - attempt ${attempt}/${maxRetries}):`, response.status, errorText);

                    if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
                        const delay = Math.pow(2, attempt - 1) * 1000;
                        console.log(`Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } catch (error: any) {
                if (error.message === 'FALLBACK_NEEDED') {
                    console.warn('[Drut AI] Fallback triggered: using gemini-1.5-flash');
                    currentModel = 'gemini-1.5-flash';
                    fallbackTriggered = true;
                    break; // Break retry loop to start fresh with new model
                }

                lastError = error;
                console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // If we broke out of the retry loop due to fallback needed, the while loop continues with new model
        // If we finished retries without success on fallback model (or primary if not fallback-able), throw error
        if (!fallbackTriggered || lastError) {
            // If we just fell back, we loop again. If we exhausted retries on current model, we check logic.
            // If fallbackTriggered is true BUT we are here, it means we finished the retry loop for the fallback model too (or we just set it).
            // Actually, if we set fallbackTriggered=true and break, we hit this code.
            // We need to distinguish between "need to loop for fallback" and "exhausted all retries".

            if (currentModel === 'gemini-1.5-flash' && lastError) {
                // We failed on fallback too
                throw lastError;
            }

            if (currentModel === 'gemini-1.5-flash') {
                // We shouldn't be here if we just set it, unless we restructure the loop.
                // Let's rely on the break.
                // Re-entering the loop
            } else {
                // We failed on primary and it wasn't a fallback case (e.g. 429s) or we exhausted retries
                throw lastError || new Error('Gemini API failed after retries');
            }
        }
    }
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
        // Use 3.0-flash-preview for verification
        const response = await generateContent(prompt, 'You are a physics solver. Reply with only one letter: A, B, C, or D. No explanation.', 0.1, 'gemini-3-flash-preview');
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

/**
 * Generate text embeddings using text-embedding-004
 * Returns array of 768 floats
 */
// [Deleted duplicate generateContent implementation]

export async function embedText(text: string): Promise<number[]> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

    // Retry logic for embeddings
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: { parts: [{ text: text.substring(0, 2048) }] }, // Truncate to avoid limits
                    model: 'models/text-embedding-004'
                }),
            });

            if (!response.ok) {
                if (response.status === 429 && attempt < 3) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                    continue;
                }
                throw new Error(`Embedding API error: ${response.status}`);
            }

            const data = await response.json();
            return data.embedding.values;
        } catch (error) {
            console.error('Embedding error:', error);
            if (attempt === 3) throw error;
        }
    }
    return [];
}

export { SCHEMA_HINT };
