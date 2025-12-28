/**
 * Drut AI Speed Test v2 - Multiple iterations for accuracy
 */

import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function testSpeed(thinkingLevel, iterations = 3) {
    const prompt = `Generate a simple multiple choice question about percentages with 4 options. Return only JSON: {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0}`;

    const times = [];

    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        try {
            await client.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    temperature: 0.2,
                    thinkingConfig: { thinkingLevel }
                }
            });
            times.push(Date.now() - start);
        } catch (e) {
            console.error(`   Iteration ${i + 1} failed: ${e.message}`);
        }
        // Small delay between requests
        await new Promise(r => setTimeout(r, 500));
    }

    return times;
}

async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('   DRUT AI SPEED TEST v2 (3 iterations each)');
    console.log('═══════════════════════════════════════════════');

    console.log('\n🚀 Testing LOW thinking (speed mode)...');
    const lowTimes = await testSpeed('low', 3);
    console.log(`   Times: ${lowTimes.join('ms, ')}ms`);

    console.log('\n🧠 Testing HIGH thinking (deep mode)...');
    const highTimes = await testSpeed('high', 3);
    console.log(`   Times: ${highTimes.join('ms, ')}ms`);

    const avgLow = lowTimes.reduce((a, b) => a + b, 0) / lowTimes.length;
    const avgHigh = highTimes.reduce((a, b) => a + b, 0) / highTimes.length;

    console.log('\n═══════════════════════════════════════════════');
    console.log('   AVERAGE RESULTS');
    console.log('═══════════════════════════════════════════════');
    console.log(`   🚀 LOW avg:  ${Math.round(avgLow)}ms`);
    console.log(`   🧠 HIGH avg: ${Math.round(avgHigh)}ms`);
    console.log(`   ⚡ Difference: ${Math.round(avgHigh - avgLow)}ms`);
    console.log(`   📊 Ratio: ${(avgHigh / avgLow).toFixed(2)}x`);
    console.log('═══════════════════════════════════════════════\n');
}

main().catch(console.error);
