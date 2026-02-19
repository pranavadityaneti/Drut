
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RUNPOD_API_URL = "http://213.173.102.224:28199/v1/chat/completions";
const RUNPOD_MODEL = "PhysicsWallahAI/Aryabhata-1.0";

serve(async (req) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        console.log("Attempting to fetch RunPod...");

        // Simple Ping - Ask for "Hello"
        const response = await fetch(RUNPOD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: RUNPOD_MODEL,
                messages: [
                    { role: "system", content: "You are a JSON API. You must ONLY output valid JSON. No conversational text." },
                    { role: "user", content: "Generate 1 Math question about fractions in JSON." },
                    { role: "assistant", content: `{"questions": [{"questionText": "What is 1/2 + 1/4?", "options": [{"text": "3/4", "isCorrect": true}, {"text": "1/2", "isCorrect": false}], "difficulty": "Easy"}]}` },
                    { role: "user", content: "Generate 1 Math question about circles." }
                ],
                max_tokens: 500, // Enough for JSON
                stop: ["<|im_start|>", "<|im_end|>"]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const text = await response.text();

        return new Response(JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            body: text,
            headers: Object.fromEntries(response.headers.entries())
        }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err: any) {
        return new Response(JSON.stringify({
            error: true,
            name: err.name,
            message: err.message,
            stack: err.stack
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
