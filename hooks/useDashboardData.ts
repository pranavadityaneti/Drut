/**
 * useDashboardData Hook
 * 
 * Fetches and computes dashboard stats from user_pattern_mastery table
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { EXAM_TAXONOMY, getExam, TopicDef } from '../lib/taxonomy';

// ============================================================
// Types
// ============================================================

export interface PatternMastery {
    id: string;
    fsm_tag: string;
    mastery_level: 'novice' | 'learning' | 'verified';
    streak: number;
    is_in_debt: boolean;
    last_practiced_at: string;
}

export interface TopicStats {
    topic: TopicDef;
    totalPatterns: number;
    verifiedPatterns: number;
    learningPatterns: number;
    progressPercent: number;
}

export interface DashboardData {
    // Speed Score
    speedScore: number;
    speedRating: 'Rookie' | 'Learner' | 'Pro' | 'Elite';
    speedTrend: number; // +/- percentage

    // Patterns
    totalPatternsSeen: number;
    verifiedPatterns: number;
    learningPatterns: number;

    // Debt
    debtPatterns: PatternMastery[];
    debtCount: number;

    // Topic breakdown
    topicStats: TopicStats[];

    // Raw data
    patterns: PatternMastery[];
}



// ============================================================
// Hook
// ============================================================

export function useDashboardData() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [examProfile, setExamProfile] = useState<string>('cat');

    const fetchData = useCallback(async () => {
        try {
            // Don't set loading to true on refetch to avoid flicker
            if (!data) setLoading(true);
            setError(null);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Not authenticated');
                return;
            }

            // 1. Fetch User Profile
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('exam_profile')
                .eq('user_id', user.id)
                .single();

            const exam = profile?.exam_profile || 'cat';
            setExamProfile(exam);

            // 2. Fetch Pattern Mastery
            const { data: patterns, error: patternsError } = await supabase
                .from('user_pattern_mastery')
                .select('*')
                .eq('user_id', user.id)
                .order('last_practiced_at', { ascending: false });

            if (patternsError) throw patternsError;
            const patternData = (patterns || []) as PatternMastery[];

            // 3. Fetch Realtime Stats (Trend & Counts)
            // Note: These use the RPC functions defined in migration 015
            const { data: trendData } = await supabase.rpc('get_user_accuracy_trend', { p_user_id: user.id });
            const { data: topicCounts } = await supabase.rpc('get_topic_pattern_counts');

            // --- Compute Stats ---

            // Patterns
            const verifiedPatterns = patternData.filter(p => p.mastery_level === 'verified').length;
            const learningPatterns = patternData.filter(p => p.mastery_level === 'learning').length;
            const totalPatternsSeen = patternData.length;
            const debtPatterns = patternData.filter(p => p.is_in_debt);

            // Speed Score (0-100)
            // Simple formula: verified ratio * accuracy trend factor
            // For now, stick to verification ratio until we have complex formula
            const speedScore = totalPatternsSeen > 0
                ? Math.round((verifiedPatterns / totalPatternsSeen) * 100)
                : 0;

            // Speed Rating
            let speedRating: 'Rookie' | 'Learner' | 'Pro' | 'Elite' = 'Rookie';
            if (speedScore >= 86) speedRating = 'Elite';
            else if (speedScore >= 61) speedRating = 'Pro';
            else if (speedScore >= 31) speedRating = 'Learner';

            // Trend
            const speedTrend = trendData && trendData.length > 0 ? Number(trendData[0].trend_percentage) : 0;

            // Topic Stats
            const examDef = getExam(exam);
            const topicStats: TopicStats[] = (examDef?.topics || []).map(topic => {
                // Find total patterns for this topic from DB counts
                const dbTopicCount = topicCounts?.find((tc: any) => tc.topic === topic.value)?.total_patterns || 0;

                // If DB count is 0, fall back to subtopic length as naive estimate
                const totalAvailable = dbTopicCount > 0 ? dbTopicCount : topic.subtopics.length * 5;

                // Patterns user has practiced in this topic
                const userTopicPatterns = patternData.filter(p => {
                    const tagLower = p.fsm_tag.toLowerCase();
                    const topicLower = topic.value.toLowerCase();
                    return tagLower.includes(topicLower.split('-')[0]);
                });

                const verified = userTopicPatterns.filter(p => p.mastery_level === 'verified').length;
                const learning = userTopicPatterns.filter(p => p.mastery_level === 'learning').length;

                return {
                    topic,
                    totalPatterns: totalAvailable,
                    verifiedPatterns: verified,
                    learningPatterns: learning,
                    progressPercent: totalAvailable > 0 ? Math.round((verified / totalAvailable) * 100) : 0,
                };
            });

            setData({
                speedScore,
                speedRating,
                speedTrend,
                totalPatternsSeen,
                verifiedPatterns,
                learningPatterns,
                debtPatterns,
                debtCount: debtPatterns.length,
                topicStats,
                patterns: patternData,
            });

        } catch (err: any) {
            console.error('[useDashboardData] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [data]); // data dep allows us to check if it's first load

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Realtime Subscription
    useEffect(() => {
        const subscription = supabase
            .channel('dashboard_updates')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'user_pattern_mastery'
                },
                (payload) => {
                    console.log('[Realtime] Pattern mastery changed:', payload);
                    // Simple strategy: refetch all data on change
                    // Optimization: merge payload into state locally
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []); // Empty dep array = runs once on mount

    return { data, loading, error, examProfile, refetch: fetchData };
}
