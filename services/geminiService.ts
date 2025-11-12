import { GoogleGenAI, Type } from "@google/genai";
import { QuestionData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questionText: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { text: { type: Type.STRING } },
        required: ['text']
      }
    },
    correctOptionIndex: { type: Type.INTEGER },
    timeTargets: {
      type: Type.OBJECT,
      properties: {
        jee_main: { type: Type.INTEGER },
        cat: { type: Type.INTEGER },
        eamcet: { type: Type.INTEGER }
      },
      required: ['jee_main', 'cat', 'eamcet']
    },
    fastestSafeMethod: {
      type: Type.OBJECT,
      properties: {
        exists: { type: Type.BOOLEAN },
        preconditions: { type: Type.STRING },
        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
        sanityCheck: { type: Type.STRING }
      },
      required: ['exists', 'preconditions', 'steps', 'sanityCheck']
    },
    fullStepByStep: {
      type: Type.OBJECT,
      properties: {
        steps: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['steps']
    }
  },
  required: ['questionText', 'options', 'correctOptionIndex', 'timeTargets', 'fastestSafeMethod', 'fullStepByStep']
};

const getPrompt = (topic: string, subTopic: string, examProfile: string) => `
You are an expert AI tutor for competitive exams like JEE, CAT, and EAMCET.
Generate a practice question for the main topic "${topic}", focusing specifically on the sub-topic "${subTopic}", with difficulty relevant to the "${examProfile}" exam.

**CRITICAL INSTRUCTIONS:**
1.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object matching the provided schema. Do not include any text before or after the JSON object.
2.  **Fastest Safe Method (FSM):**
    - If a valid, safe shortcut exists, set \`exists\` to \`true\`. The method must be concise (under 120 words or 3-5 steps).
    - **Preconditions are mandatory:** Clearly state when the shortcut applies (e.g., "Works for consecutive percentage changes").
    - **Sanity Check is mandatory:** Include a quick mental check (e.g., "The final value should be slightly lower").
    - If no reliable shortcut exists, you MUST set \`exists\` to \`false\` to build user trust.
3.  **Full Step-by-Step:** Provide a clear, conventional, and detailed solution. Where it enhances clarity, use simple Markdown for tables.
4.  **Options:** Provide 4 plausible multiple-choice options.
`;

export const generateQuestionAndSolutions = async (topic: string, subTopic: string, examProfile: string): Promise<QuestionData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: getPrompt(topic, subTopic, examProfile),
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);
    
    // Basic validation
    if (!parsedData.questionText || !parsedData.options || parsedData.options.length !== 4) {
      throw new Error("Invalid data structure received from API.");
    }

    return parsedData as QuestionData;

  } catch (error) {
    console.error("Error generating question with Gemini:", error);
    throw new Error("Failed to generate question. The API key might be invalid or the service is temporarily down.");
  }
};