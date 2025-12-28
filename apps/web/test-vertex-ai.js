// Test Vertex AI Integration
import { getGeminiModel } from './lib/ai/vertexAiClient.js';

async function testVertexAI() {
    console.log('🧪 Testing Vertex AI Integration...\n');

    try {
        console.log('1️⃣ Initializing Vertex AI client...');
        const model = getGeminiModel('gemini-1.5-flash');
        console.log('✅ Client initialized successfully\n');

        console.log('2️⃣ Testing simple content generation...');
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Say "Hello from Vertex AI!" in JSON format with a message field.' }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
            },
        });

        const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('✅ Response received:\n', response);

        console.log('\n3️⃣ Testing question generation...');
        const questionResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Generate a simple math question with 4 options in JSON format.' }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3,
            },
        });

        const questionResponse = questionResult.response.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('✅ Question generated:\n', questionResponse?.substring(0, 200) + '...');

        console.log('\n🎉 All tests passed! Vertex AI is working correctly.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nFull error:', error);

        if (error.message?.includes('auth') || error.message?.includes('401')) {
            console.log('\n💡 Tip: Check your API key or authentication credentials');
        }
        if (error.message?.includes('project') || error.message?.includes('404')) {
            console.log('\n💡 Tip: Verify your GCP project ID is correct');
        }

        process.exit(1);
    }
}

testVertexAI();
