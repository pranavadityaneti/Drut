const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

const KEY_PATH = '/Users/apple/Downloads/gen-lang-client-0555018920-c3abedb3a871.json';
const PROJECT_ID = 'gen-lang-client-0555018920';
const LOCATION = 'us-central1';

async function testModel(modelId, apiVersion = 'v1') {
    console.log(`\n🧪 Testing ${modelId} (${apiVersion})...`);

    try {
        const auth = new GoogleAuth({
            keyFile: KEY_PATH,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/${apiVersion}/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:generateContent`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 10 }
            }),
        });

        if (response.ok) {
            console.log(`✅ SUCCESS: ${modelId} is available!`);
            return true;
        } else {
            const error = await response.text();
            console.log(`❌ FAILED: ${modelId}`);
            console.log(`   Status: ${response.status}`);
            try {
                const json = JSON.parse(error);
                console.log(`   Error: ${json.error.message}`);
            } catch (e) {
                console.log(`   Raw: ${error}`);
            }
            return false;
        }
    } catch (error) {
        console.error('   Exception:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🔍 Checking available Vertex AI models...');
    console.log(`   Project: ${PROJECT_ID}`);
    console.log(`   Service Account: drut-vertex-ai@gen-lang-client-0555018920.iam.gserviceaccount.com`);

    const regions = ['us-central1', 'us-east1', 'us-west1'];

    for (const region of regions) {
        console.log(`\n--- Testing Region: ${region} ---`);
        // Test Gemini 1.5 Flash (Most Available)
        await testModel('gemini-1.5-flash', 'v1', region);
        // Test Gemini 1.5 Pro (Stable)
        await testModel('gemini-1.5-pro-002', 'v1', region);
        // Test Experimental
        await testModel('gemini-experimental', 'v1beta1', region);
    }
}

runTests();
