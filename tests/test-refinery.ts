/**
 * Test script for Content Refinery
 * Run with: npx tsx tests/test-refinery.ts
 */

import { ingestAndRefineQuestion, toQuestionData } from '../services/contentRefinery';

const TEST_QUESTIONS = [
    // Math - Speed/Distance
    `A train 150m long passes a platform 350m long in 25 seconds. What is the speed of the train?
  (A) 72 km/hr  (B) 80 km/hr  (C) 60 km/hr  (D) 54 km/hr`,

    // Algebra - Percentage
    `If the price of an item is increased by 20% and then decreased by 20%, what is the net change?
  (A) No change  (B) 4% decrease  (C) 4% increase  (D) 2% decrease`,

    // Number Theory - Divisibility
    `What is the remainder when 7^100 is divided by 5?
  (A) 1  (B) 2  (C) 3  (D) 4`,
];

async function runTest() {
    console.log('🧪 Content Refinery Test\n');
    console.log('='.repeat(60));

    for (let i = 0; i < TEST_QUESTIONS.length; i++) {
        const rawText = TEST_QUESTIONS[i];
        console.log(`\n📝 Question ${i + 1}:`);
        console.log(rawText.slice(0, 100) + '...\n');

        try {
            console.log('⏳ Refining...');
            const startTime = Date.now();

            const refined = await ingestAndRefineQuestion(rawText);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log(`✅ Success in ${elapsed}s`);
            console.log(`   FSM Tag: ${refined.fsm_tag}`);
            console.log(`   Difficulty: ${refined.difficulty}`);
            console.log(`   Target Time: ${refined.target_time_sec}s`);
            console.log(`   Topic: ${refined.topic} > ${refined.subtopic}`);
            console.log(`   Correct: Option ${String.fromCharCode(65 + refined.correct_option_index)}`);
            console.log(`\n   FSM (shortcut):`);
            console.log(`   ${refined.explanation_fsm.slice(0, 150)}...`);

            // Transform to QuestionData
            const questionData = toQuestionData(refined);
            console.log(`\n   ✓ Transformed to QuestionData format`);

        } catch (error: any) {
            console.log(`❌ Failed: ${error.message}`);
        }

        console.log('\n' + '-'.repeat(60));

        // Rate limit delay
        if (i < TEST_QUESTIONS.length - 1) {
            console.log('⏸️  Waiting 2s before next question...');
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log('\n🏁 Test complete!');
}

runTest().catch(console.error);
