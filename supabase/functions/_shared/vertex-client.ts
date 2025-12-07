// Shared Vertex AI client for Edge Functions
import { GoogleAuth } from 'npm:google-auth-library@9';

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

/**
 * Get authenticated Vertex AI client using service account
 */
export async function getVertexAIClient() {
    const projectId = Deno.env.get('VERTEX_AI_PROJECT_ID');
    const location = Deno.env.get('VERTEX_AI_LOCATION') || 'us-central1';
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');

    if (!projectId || !serviceAccountKey) {
        throw new Error('Missing required environment variables');
    }

    // Parse service account JSON
    const credentials = JSON.parse(serviceAccountKey);

    // Create auth client
    const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
        throw new Error('Failed to get access token');
    }

    return {
        projectId,
        location,
        accessToken: accessToken.token,
    };
}

/**
 * Call Vertex AI Gemini API
 */
export async function generateContent(
    prompt: string,
    systemInstruction?: string,
    temperature = 0.3
): Promise<string> {
    const { projectId, location, accessToken } = await getVertexAIClient();

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-experimental:generateContent`;

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
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vertex AI API error: ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
}

/**
 * Extract JSON from response (handles code fences)
 */
export function extractJSON(text: string): string {
    const fence = text.match(/```json([\s\S]*?)```/i);
    if (fence) return fence[1].trim();

    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
        return text.slice(first, last + 1);
    }
    return text;
}

export { SCHEMA_HINT };
