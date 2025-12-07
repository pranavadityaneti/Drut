import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyAEeKi8yNY9yf0OptQq46RAUNZeKUDFNmY";
const client = new GoogleGenAI({ apiKey });

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
  "fullStepByStep": { "steps": string[] }
}
`.trim();

const BATCH_SYSTEM_INSTRUCTION = `
You are an expert exam question generator.
Your goal is to generate a JSON ARRAY of 2 practice questions.
Each item in the array must strictly match this schema:
${SCHEMA_HINT}

IMPORTANT:
- Output ONLY valid JSON.
- The root object must be an Array.
- Ensure all questions are unique.
`.trim();

async function testBatch() {
    console.log("Testing Batch Generation...");
    const count = 2;
    const spec = { exam: "CAT", topic: "Algebra", subtopic: "Quadratic Equations", difficulty: "Medium" };

    const batchPrompt = `
Generate ${count} UNIQUE practice questions for:
- Exam Profile: ${spec.exam}
- Topic: ${spec.topic}
- Subtopic: ${spec.subtopic}
- Difficulty Level: ${spec.difficulty}

The questions should be conceptual and appropriate for the exam.
Return a JSON ARRAY of questions.
`;

    try {
        const res = await client.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: batchPrompt,
            config: {
                systemInstruction: BATCH_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                temperature: 0.4,
            },
        });

        console.log("Raw Response:", res.text);

        if (!res.text) {
            console.error("Empty response text!");
            return;
        }

        try {
            const parsed = JSON.parse(res.text);
            if (Array.isArray(parsed)) {
                console.log("SUCCESS: Parsed Array Length:", parsed.length);
                console.log("First Question:", parsed[0].questionText);
            } else {
                console.error("FAILED: Response is not an array", parsed);
            }
        } catch (e) {
            console.error("FAILED: JSON Parse Error", e.message);
        }

    } catch (e) {
        console.error("FAILED: API Error", e);
        if (e.response) {
            console.error("Response Status:", e.response.status);
            console.error("Response Data:", e.response.data);
        }
    }
}

testBatch();
