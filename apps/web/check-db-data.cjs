// Quick script to check database data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://ukrtaerwaxekonislnpw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8'
);

async function checkData() {
    console.log('Checking database data...\n');

    // 1. Count sprint sessions
    const { data: sprints, error: sprintError } = await supabase
        .from('sprint_sessions')
        .select('id, user_id, total_questions, correct_count, started_at', { count: 'exact' })
        .limit(10);

    console.log('=== SPRINT SESSIONS ===');
    console.log('Count:', sprints?.length || 0);
    if (sprints && sprints.length > 0) {
        console.log('Sample:', JSON.stringify(sprints[0], null, 2));
        // Get unique user IDs
        const userIds = [...new Set(sprints.map(s => s.user_id))];
        console.log('User IDs with sprints:', userIds);
    }
    if (sprintError) console.log('Error:', sprintError.message);

    // 2. Count question history
    const { data: history, error: historyError } = await supabase
        .from('user_question_history')
        .select('id, user_id, is_correct', { count: 'exact' })
        .limit(10);

    console.log('\n=== USER QUESTION HISTORY ===');
    console.log('Count:', history?.length || 0);
    if (history && history.length > 0) {
        const userIds = [...new Set(history.map(h => h.user_id))];
        console.log('User IDs with history:', userIds);
    }
    if (historyError) console.log('Error:', historyError.message);

    // 3. Count sprint attempts
    const { data: attempts, error: attemptsError } = await supabase
        .from('sprint_question_attempts')
        .select('id, session_id', { count: 'exact' })
        .limit(10);

    console.log('\n=== SPRINT QUESTION ATTEMPTS ===');
    console.log('Count:', attempts?.length || 0);
    if (attemptsError) console.log('Error:', attemptsError.message);

    // 4. Check user_pattern_mastery
    const { data: patterns, error: patternsError } = await supabase
        .from('user_pattern_mastery')
        .select('id, user_id, mastery_level', { count: 'exact' })
        .limit(10);

    console.log('\n=== USER PATTERN MASTERY ===');
    console.log('Count:', patterns?.length || 0);
    if (patterns && patterns.length > 0) {
        const userIds = [...new Set(patterns.map(p => p.user_id))];
        console.log('User IDs with patterns:', userIds);
    }
    if (patternsError) console.log('Error:', patternsError.message);
}

checkData().catch(console.error);
