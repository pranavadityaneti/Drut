// Edge Function: Generate AI tips based on performance
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { generateContent, extractJSON } from '../_shared/vertex-client.ts';
import type { PerformanceData } from '../_shared/types.ts';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body: { performanceData: PerformanceData } = await req.json();
        const performanceData = body.performanceData;

        if (!performanceData) {
            return new Response(
                JSON.stringify({ error: 'Missing performance data' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Analyze patterns
        const isLowAccuracy = performanceData.accuracy < 70;
        const isSlow = performanceData.avgTimeMs > 60000;
        const isFast = performanceData.avgTimeMs < 20000;

        const prompt = `
You are an expert learning coach analyzing a student's performance data to provide highly specific, actionable study tips.

PERFORMANCE METRICS:
- Total Questions: ${performanceData.totalAttempts}
- Overall Accuracy: ${performanceData.accuracy.toFixed(1)}%
- Average Response Time: ${Math.round(performanceData.avgTimeMs / 1000)}s per question

WEAK AREAS (Lowest Accuracy):
${performanceData.weakestSubtopics.length > 0
                ? performanceData.weakestSubtopics.map(w => `- ${w.subtopic}: ${w.accuracy.toFixed(1)}% accuracy`).join('\n')
                : '- No weak areas identified yet'}

COMMON TRAPS (Most Clicked Wrong Answers):
${performanceData.distractors.length > 0
                ? performanceData.distractors.slice(0, 3).map(d => `- "${d.wrong_answer_text}" in ${d.subtopic} (clicked ${d.choice_count}x)`).join('\n')
                : '- No distractor patterns identified yet'}

BEHAVIORAL PATTERNS DETECTED:
${isLowAccuracy ? '⚠️ Accuracy below 70% - focus on concept clarity before speed' : ''}
${isSlow ? '⚠️ Slow response time - may indicate overthinking or weak fundamentals' : ''}
${isFast && isLowAccuracy ? '⚠️ Fast but inaccurate - rushing through questions' : ''}

YOUR TASK:
Generate 4-5 HIGHLY SPECIFIC, ACTIONABLE study tips tailored to THIS student's exact performance patterns.

REQUIREMENTS:
1. Be SPECIFIC - reference actual subtopics, accuracy percentages, or patterns from the data
2. Be ACTIONABLE - tell them exactly what to DO
3. Be CONCISE - max 20 words per tip
4. PRIORITIZE based on what will have the biggest impact

Return ONLY a JSON array of tip strings, no other text.
Example: ["Tip 1", "Tip 2", "Tip 3", "Tip 4"]
`;

        const response = await generateContent(prompt, undefined, 0.8);
        const jsonStr = extractJSON(response);
        const parsed = JSON.parse(jsonStr);

        if (Array.isArray(parsed) && parsed.length > 0) {
            return new Response(
                JSON.stringify({ tips: parsed.slice(0, 5) }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Fallback tips
        return new Response(
            JSON.stringify({
                tips: [
                    `Focus on ${performanceData.weakestSubtopics[0]?.subtopic || 'your weak areas'} - practice more`,
                    `Current accuracy: ${performanceData.accuracy.toFixed(0)}% - aim for 80%+`,
                    "Review explanations carefully after each wrong answer",
                    "Keep practicing to build momentum!"
                ]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error generating tips:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to generate tips' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
