/**
 * Backfill Script: Populate user_pattern_mastery from existing sprint_question_attempts
 * 
 * This script reads all sprint question attempts and calls the save_attempt_and_update_mastery
 * RPC to populate the pattern mastery table with historical data.
 * 
 * Run with: node scripts/backfill-pattern-mastery.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually since dotenv may not be installed
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        // Strip quotes from value
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const supabase = createClient(
    envVars.SUPABASE_URL,
    envVars.SUPABASE_ANON_KEY
);

async function backfillPatternMastery() {
    console.log('🔄 Starting pattern mastery backfill...\n');

    try {
        // 1. Fetch all sprint question attempts
        const { data: attempts, error: fetchError } = await supabase
            .from('sprint_question_attempts')
            .select('*')
            .order('attempted_at', { ascending: true });

        if (fetchError) {
            console.error('❌ Failed to fetch attempts:', fetchError);
            return;
        }

        if (!attempts || attempts.length === 0) {
            console.log('📭 No sprint attempts found to backfill.');
            return;
        }

        console.log(`📊 Found ${attempts.length} sprint attempts to process.\n`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        // 2. Process each attempt
        for (const attempt of attempts) {
            const questionData = attempt.question_data;
            const fsmTag = questionData?.fsmTag;

            if (!fsmTag) {
                skipCount++;
                continue; // Skip attempts without fsm_tag
            }

            const isCorrect = attempt.result === 'correct';
            const timeTakenMs = attempt.time_taken_ms || 45000;
            const targetTimeMs = 45000; // Sprint default

            try {
                const { error: rpcError } = await supabase.rpc('save_attempt_and_update_mastery', {
                    p_user_id: attempt.user_id,
                    p_question_uuid: attempt.question_id,
                    p_fsm_tag: fsmTag,
                    p_is_correct: isCorrect,
                    p_time_ms: timeTakenMs,
                    p_target_time_ms: targetTimeMs,
                    p_selected_option_index: attempt.selected_option_index ?? -1,
                    p_skip_drill: false,
                });

                if (rpcError) {
                    console.warn(`⚠️  RPC error for ${attempt.id}:`, rpcError.message);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.warn(`⚠️  Exception for ${attempt.id}:`, err.message);
                errorCount++;
            }

            // Progress indicator every 50 attempts
            if ((successCount + skipCount + errorCount) % 50 === 0) {
                console.log(`   Processed ${successCount + skipCount + errorCount}/${attempts.length}...`);
            }
        }

        console.log('\n✅ Backfill complete!');
        console.log(`   ✓ Success: ${successCount}`);
        console.log(`   ○ Skipped (no fsmTag): ${skipCount}`);
        console.log(`   ✗ Errors: ${errorCount}`);

        // 3. Show summary of mastery data
        const { data: masteryStats, error: statsError } = await supabase
            .from('user_pattern_mastery')
            .select('mastery_level')
            .order('mastery_level');

        if (!statsError && masteryStats) {
            const levels = masteryStats.reduce((acc, row) => {
                acc[row.mastery_level] = (acc[row.mastery_level] || 0) + 1;
                return acc;
            }, {});

            console.log('\n📈 Pattern Mastery Summary:');
            console.log(`   Novice: ${levels.novice || 0}`);
            console.log(`   Learning: ${levels.learning || 0}`);
            console.log(`   Verified: ${levels.verified || 0}`);
            console.log(`   Total: ${masteryStats.length} patterns`);
        }

    } catch (error) {
        console.error('❌ Backfill failed:', error);
    }
}

// Run the backfill
backfillPatternMastery();
