// Shared OpenAI AI client for Edge Functions.
// (Replaced the former Gemini/Vertex + RunPod client, 2026-06-20 — full OpenAI
// migration. All exports keep the same signatures, so the ~10 edge functions
// that import from here are unchanged.)
//
// ACTIVATION: requires the Supabase secret OPENAI_API_KEY:
//   supabase secrets set OPENAI_API_KEY="sk-..."   then redeploy the functions.

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

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set! Set it with: supabase secrets set OPENAI_API_KEY="sk-..."');
}

// Default text model + a "pro" tier for heavier extraction (e.g. textbook TOC).
const TEXT_MODEL = 'gpt-5.4-mini';
const TEXT_MODEL_PRO = 'gpt-5.4';
// Edge functions have a short wall-clock budget, so keep reasoning light here.
// (Heavy question generation runs in the operator script, not these functions.)
const REASONING_EFFORT = 'low';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pull the text out of an OpenAI Responses API result.
function extractResponsesText(data: any): string {
    if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
    if (Array.isArray(data.output)) {
        const parts: string[] = [];
        for (const item of data.output) {
            if (Array.isArray(item.content)) {
                for (const c of item.content) if (typeof c.text === 'string') parts.push(c.text);
            }
        }
        if (parts.length) return parts.join('');
    }
    return '';
}

/**
 * Generate text with OpenAI. Signature preserved from the old Gemini client.
 *  - `model`: any value containing "pro" routes to the stronger model; otherwise mini.
 *  - `temperature`: accepted for compatibility (reasoning models manage their own).
 * Returns the raw text; callers parse JSON via extractJSON().
 */
export async function generateContent(
    prompt: string,
    systemInstruction?: string,
    _temperature = 0.3,
    model = TEXT_MODEL,
    jsonMode = true,
): Promise<string> {
    const oaiModel = /pro/i.test(model) ? TEXT_MODEL_PRO : TEXT_MODEL;
    // Force strict JSON output (mirrors the old Gemini responseMimeType:'application/json')
    // so callers' JSON.parse / extractJSON never trip on trailing prose. verifyAnswer
    // opts out via jsonMode=false (it wants a single letter).
    const instructions = jsonMode
        ? `${systemInstruction || ''}\nReturn ONLY valid JSON (a single object or array) — no markdown, fences, or commentary before or after it.`.trim()
        : systemInstruction;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
                body: JSON.stringify({
                    model: oaiModel,
                    ...(instructions ? { instructions } : {}),
                    input: prompt,
                    reasoning: { effort: REASONING_EFFORT },
                }),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    console.log(`OpenAI ${response.status}; retrying in ${delay}ms...`);
                    await sleep(delay);
                    continue;
                }
                throw new Error(`OpenAI API error: ${response.status} - ${errorText.slice(0, 300)}`);
            }

            const data = await response.json();
            return extractResponsesText(data);
        } catch (error: any) {
            lastError = error;
            console.error(`generateContent attempt ${attempt}/${maxRetries} failed:`, error.message);
            if (attempt < maxRetries) await sleep(Math.pow(2, attempt - 1) * 1000);
        }
    }
    throw lastError || new Error('OpenAI API failed after retries');
}

/**
 * Diagram image generation is DISABLED (Gemini image model removed in the OpenAI
 * migration). Diagrams are currently sourced/fed manually; auto-generation via an
 * OpenAI image model is a future option (see forlater). Returns null so callers
 * (generate-diagram) degrade gracefully, exactly as they did on a Gemini failure.
 */
export async function generateDiagramImage(
    _visualDescription: string,
): Promise<{ base64: string; mimeType: string } | null> {
    console.warn('generateDiagramImage: disabled (no image model wired after Gemini removal).');
    return null;
}

/**
 * PASS 2: Verify answer independently. Uses generateContent (now OpenAI).
 */
export async function verifyAnswer(questionText: string, options: string[]): Promise<{
    matchedOptionIndex: number | null;
    isValid: boolean;
}> {
    const prompt = `Solve this problem and tell me which option is correct.

PROBLEM: ${questionText}

OPTIONS:
A) ${options[0]}
B) ${options[1]}
C) ${options[2]}
D) ${options[3]}

Reply with ONLY the letter (A, B, C, or D) of the correct answer. Nothing else.`;

    try {
        const response = await generateContent(prompt, 'You are an exam solver. Reply with only one letter: A, B, C, or D. No explanation.', 0.1, TEXT_MODEL, false);
        const letter = response.replace(/[^A-D]/gi, '').toUpperCase().charAt(0);
        const optionMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
        if (letter in optionMap) return { matchedOptionIndex: optionMap[letter], isValid: true };
        return { matchedOptionIndex: null, isValid: false };
    } catch (error) {
        console.error('[VERIFY] Error:', error);
        return { matchedOptionIndex: null, isValid: false };
    }
}

export function extractJSON(text: string): string {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // Unwrap a code fence if present.
    const fence = cleaned.match(/```json([\s\S]*?)```/i) || cleaned.match(/```([\s\S]*?)```/);
    if (fence) cleaned = fence[1].trim();
    // If it already parses, return as-is (the common case with strict JSON output).
    try { JSON.parse(cleaned); return cleaned; } catch { /* fall through to extraction */ }
    // Slice out the outermost JSON value, choosing object vs array by whichever
    // delimiter appears FIRST. (Slicing array-first would mangle an object that
    // merely contains arrays — e.g. options/steps — and vice-versa.)
    const fo = cleaned.indexOf('{'), fb = cleaned.indexOf('[');
    let start = -1, end = -1;
    if (fo !== -1 && (fb === -1 || fo < fb)) { start = fo; end = cleaned.lastIndexOf('}'); }
    else if (fb !== -1) { start = fb; end = cleaned.lastIndexOf(']'); }
    if (start !== -1 && end > start) return cleaned.slice(start, end + 1);
    return cleaned;
}

/**
 * Generate text embeddings using OpenAI text-embedding-3-small at 768 dims —
 * MUST match the model used to (re)embed textbook_chunks (scripts/reembed-chunks.mjs),
 * so query and chunk vectors share the same space. Returns 768 floats.
 */
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 768;

export async function embedText(text: string): Promise<number[]> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
                body: JSON.stringify({
                    model: EMBEDDING_MODEL,
                    input: text.substring(0, 8000) || ' ',
                    dimensions: EMBEDDING_DIMS,
                }),
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                if ((response.status === 429 || response.status >= 500) && attempt < 3) {
                    await sleep(1000 * attempt);
                    continue;
                }
                throw new Error(`Embedding API error: ${response.status} ${errText.substring(0, 200)}`);
            }

            const data = await response.json();
            const values: number[] = data.data?.[0]?.embedding ?? [];
            if (values.length !== EMBEDDING_DIMS) {
                throw new Error(`Embedding dimension mismatch: got ${values.length}, expected ${EMBEDDING_DIMS}`);
            }
            return values;
        } catch (error) {
            console.error('Embedding error:', error);
            if (attempt === 3) throw error;
        }
    }
    return [];
}

export { SCHEMA_HINT };
