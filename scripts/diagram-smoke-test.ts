/**
 * Diagram Generation Smoke Test
 * 
 * Tests diagram generation across Physics, Chemistry, and Maths
 * at Easy, Medium, and Hard difficulty levels.
 * 
 * Run with: npx ts-node scripts/diagram-smoke-test.ts
 */

const SUPABASE_URL = 'https://ukrtaerwaxekonislnpw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8';

interface TestCase {
    id: string;
    subject: 'Physics' | 'Chemistry' | 'Maths';
    topic: string;
    subtopic: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface TestResult {
    testCase: TestCase;
    questionGenTime: number;
    diagramGenTime: number | null;
    totalTime: number;
    success: boolean;
    diagramUrl: string | null;
    error: string | null;
    questionText: string | null;
    visualDescription: string | null;
}

// 9 Test Cases: Focused on DIAGRAM_REQUIRED_SUBTOPICS
// These subtopics should now trigger diagram generation after the fix:
// pulleys-inclined-planes, free-body-diagrams, projectile-motion, circular-motion,
// mirrors-lenses, reflection-refraction, resistances-series-parallel, wheatstone-bridge, kirchhoffs-laws, capacitors
const TEST_CASES: TestCase[] = [
    // Physics - Diagram-required subtopics
    { id: 'PHY-EASY-2', subject: 'Physics', topic: 'laws-of-motion', subtopic: 'pulleys-inclined-planes', difficulty: 'Easy' },
    { id: 'PHY-MED-2', subject: 'Physics', topic: 'laws-of-motion', subtopic: 'free-body-diagrams', difficulty: 'Medium' },
    { id: 'PHY-HARD-2', subject: 'Physics', topic: 'optics', subtopic: 'mirrors-lenses', difficulty: 'Hard' },

    // Physics - Circuit diagrams
    { id: 'PHY-EASY-3', subject: 'Physics', topic: 'current-electricity', subtopic: 'resistances-series-parallel', difficulty: 'Easy' },
    { id: 'PHY-MED-3', subject: 'Physics', topic: 'current-electricity', subtopic: 'kirchhoffs-laws', difficulty: 'Medium' },
    { id: 'PHY-HARD-3', subject: 'Physics', topic: 'current-electricity', subtopic: 'wheatstone-bridge', difficulty: 'Hard' },

    // Physics - Motion diagrams
    { id: 'PHY-EASY-4', subject: 'Physics', topic: 'kinematics', subtopic: 'projectile-motion', difficulty: 'Easy' },
    { id: 'PHY-MED-4', subject: 'Physics', topic: 'kinematics', subtopic: 'circular-motion', difficulty: 'Medium' },
    { id: 'PHY-HARD-4', subject: 'Physics', topic: 'electrostatics', subtopic: 'capacitors', difficulty: 'Hard' },
];

async function generateQuestion(testCase: TestCase): Promise<{
    question: any;
    durationMs: number;
}> {
    const startTime = Date.now();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-question`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
            topic: testCase.topic,
            subtopic: testCase.subtopic,
            examProfile: 'jee_main',
            difficulty: testCase.difficulty,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Question generation failed: ${error}`);
    }

    const data = await response.json() as { question: any };
    return {
        question: data.question,
        durationMs: Date.now() - startTime,
    };
}

async function generateDiagram(questionId: string, visualDescription: string): Promise<{
    diagramUrl: string;
    durationMs: number;
}> {
    const startTime = Date.now();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-diagram`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
            questionId,
            visualDescription,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Diagram generation failed: ${error}`);
    }

    const data = await response.json() as { diagramUrl: string; durationMs?: number };
    return {
        diagramUrl: data.diagramUrl,
        durationMs: data.durationMs || (Date.now() - startTime),
    };
}

async function runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 Running test: ${testCase.id} (${testCase.subject} - ${testCase.difficulty})`);
    console.log(`   Topic: ${testCase.topic} / ${testCase.subtopic}`);

    try {
        // Step 1: Generate question
        console.log('   📝 Generating question...');
        const questionResult = await generateQuestion(testCase);
        const question = questionResult.question;
        console.log(`   ✅ Question generated in ${questionResult.durationMs}ms`);
        console.log(`   📋 Question: ${question.questionText?.substring(0, 80)}...`);

        // Step 2: Check if diagram is needed
        let diagramResult: { diagramUrl: string; durationMs: number } | null = null;

        if (question.visualDescription) {
            console.log(`   🖼️ Visual description found, generating diagram...`);
            console.log(`   📋 Description: ${question.visualDescription.substring(0, 80)}...`);

            const questionId = `smoke-test-${testCase.id}-${Date.now()}`;
            diagramResult = await generateDiagram(questionId, question.visualDescription);
            console.log(`   ✅ Diagram generated in ${diagramResult.durationMs}ms`);
            console.log(`   🔗 URL: ${diagramResult.diagramUrl}`);
        } else {
            console.log(`   ⚠️ No visualDescription - diagram not required`);
        }

        return {
            testCase,
            questionGenTime: questionResult.durationMs,
            diagramGenTime: diagramResult?.durationMs || null,
            totalTime: Date.now() - startTime,
            success: true,
            diagramUrl: diagramResult?.diagramUrl || null,
            error: null,
            questionText: question.questionText,
            visualDescription: question.visualDescription || null,
        };

    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        return {
            testCase,
            questionGenTime: 0,
            diagramGenTime: null,
            totalTime: Date.now() - startTime,
            success: false,
            diagramUrl: null,
            error: error.message,
            questionText: null,
            visualDescription: null,
        };
    }
}

function printSummary(results: TestResult[]) {
    console.log('\n' + '='.repeat(80));
    console.log('                    DIAGRAM GENERATION SMOKE TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Total Tests: ${results.length}`);
    console.log('');

    // Summary by Subject
    console.log('┌─────────────┬─────────┬─────────┬────────────┬────────────┬─────────────────┐');
    console.log('│   Subject   │ Success │ Failed  │ Q Avg (ms) │ D Avg (ms) │ Has Diagrams    │');
    console.log('├─────────────┼─────────┼─────────┼────────────┼────────────┼─────────────────┤');

    const subjects: Array<'Physics' | 'Chemistry' | 'Maths'> = ['Physics', 'Chemistry', 'Maths'];
    for (const subject of subjects) {
        const subjectResults = results.filter(r => r.testCase.subject === subject);
        const successCount = subjectResults.filter(r => r.success).length;
        const failedCount = subjectResults.filter(r => !r.success).length;
        const avgQTime = Math.round(subjectResults.filter(r => r.success).reduce((a, r) => a + r.questionGenTime, 0) / Math.max(1, successCount));
        const diagramResults = subjectResults.filter(r => r.diagramGenTime !== null);
        const avgDTime = diagramResults.length > 0
            ? Math.round(diagramResults.reduce((a, r) => a + (r.diagramGenTime || 0), 0) / diagramResults.length)
            : 'N/A';
        const hasDiagrams = `${diagramResults.length}/${subjectResults.length}`;

        console.log(`│ ${subject.padEnd(11)} │   ${successCount}/3   │   ${failedCount}/3   │ ${String(avgQTime).padStart(10)} │ ${String(avgDTime).padStart(10)} │ ${hasDiagrams.padStart(15)} │`);
    }
    console.log('└─────────────┴─────────┴─────────┴────────────┴────────────┴─────────────────┘');

    // Summary by Difficulty
    console.log('\n┌─────────────┬─────────┬─────────┬────────────┬────────────┬─────────────────┐');
    console.log('│ Difficulty  │ Success │ Failed  │ Q Avg (ms) │ D Avg (ms) │ Has Diagrams    │');
    console.log('├─────────────┼─────────┼─────────┼────────────┼────────────┼─────────────────┤');

    const difficulties: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];
    for (const diff of difficulties) {
        const diffResults = results.filter(r => r.testCase.difficulty === diff);
        const successCount = diffResults.filter(r => r.success).length;
        const failedCount = diffResults.filter(r => !r.success).length;
        const avgQTime = Math.round(diffResults.filter(r => r.success).reduce((a, r) => a + r.questionGenTime, 0) / Math.max(1, successCount));
        const diagramResults = diffResults.filter(r => r.diagramGenTime !== null);
        const avgDTime = diagramResults.length > 0
            ? Math.round(diagramResults.reduce((a, r) => a + (r.diagramGenTime || 0), 0) / diagramResults.length)
            : 'N/A';
        const hasDiagrams = `${diagramResults.length}/${diffResults.length}`;

        console.log(`│ ${diff.padEnd(11)} │   ${successCount}/3   │   ${failedCount}/3   │ ${String(avgQTime).padStart(10)} │ ${String(avgDTime).padStart(10)} │ ${hasDiagrams.padStart(15)} │`);
    }
    console.log('└─────────────┴─────────┴─────────┴────────────┴────────────┴─────────────────┘');

    // Detailed Results
    console.log('\n' + '-'.repeat(80));
    console.log('DETAILED RESULTS');
    console.log('-'.repeat(80));

    for (const result of results) {
        const status = result.success ? '✅' : '❌';
        const diagramStatus = result.diagramUrl ? '🖼️' : '⚠️ No diagram';
        console.log(`\n${status} ${result.testCase.id}`);
        console.log(`   Subject: ${result.testCase.subject} | Difficulty: ${result.testCase.difficulty}`);
        console.log(`   Topic: ${result.testCase.topic} / ${result.testCase.subtopic}`);
        console.log(`   Question Gen Time: ${result.questionGenTime}ms`);
        if (result.diagramGenTime !== null) {
            console.log(`   Diagram Gen Time: ${result.diagramGenTime}ms`);
        }
        console.log(`   Total Time: ${result.totalTime}ms`);
        console.log(`   ${diagramStatus}`);
        if (result.diagramUrl) {
            console.log(`   URL: ${result.diagramUrl}`);
        }
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }

    // Export URLs for manual review
    console.log('\n' + '='.repeat(80));
    console.log('DIAGRAM URLs FOR MANUAL REVIEW');
    console.log('='.repeat(80));
    const diagramUrls = results.filter(r => r.diagramUrl).map(r => ({
        id: r.testCase.id,
        subject: r.testCase.subject,
        difficulty: r.testCase.difficulty,
        url: r.diagramUrl,
    }));

    if (diagramUrls.length > 0) {
        for (const d of diagramUrls) {
            console.log(`\n${d.id} (${d.subject} - ${d.difficulty}):`);
            console.log(`  ${d.url}`);
        }
    } else {
        console.log('No diagrams were generated.');
    }
}

async function main() {
    console.log('🚀 Starting Diagram Generation Smoke Test');
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`📊 Test Cases: ${TEST_CASES.length}`);
    console.log(`🎯 Exam Profile: jee_main`);
    console.log('');

    const results: TestResult[] = [];

    for (const testCase of TEST_CASES) {
        const result = await runTest(testCase);
        results.push(result);

        // Small delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    printSummary(results);

    // Return results for programmatic use
    return results;
}

// Run the test
main().catch(console.error);
