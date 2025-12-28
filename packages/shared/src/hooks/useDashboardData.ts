/**
 * useDashboardData Hook
 * 
 * Fetches and computes dashboard stats from user_pattern_mastery table
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { EXAM_TAXONOMY, getExam, TopicDef } from '../lib/taxonomy';
import { fetchStaminaCurve, fetchSprintPerformance, StaminaPoint, SprintPerformance } from '../services/analyticsService';

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

    // Stamina & Sprint data
    staminaCurve: StaminaPoint[];
    sprintSummary: {
        totalSprints: number;
        bestScore: number;
        avgAccuracy: number;
        recentSprints: SprintPerformance[];
    } | null;
    user?: User;
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

            // 1. Get User Metadata (Target Exams & Class)
            const targetExams = (user.user_metadata?.target_exams || []) as string[];
            const userClass = user.user_metadata?.class || '11';

            // fallback if legacy user with no array
            if (targetExams.length === 0 && user.user_metadata?.exam_profile) {
                targetExams.push(user.user_metadata.exam_profile);
            }
            // default fallback
            if (targetExams.length === 0) targetExams.push('cat');

            setExamProfile(targetExams[0]); // Just for fallback/display if needed, or join them?

            // 2. Fetch Pattern Mastery
            const { data: patterns, error: patternsError } = await supabase
                .from('user_pattern_mastery')
                .select('*')
                .eq('user_id', user.id)
                .order('last_practiced_at', { ascending: false });

            if (patternsError) throw patternsError;
            const patternData = (patterns || []) as PatternMastery[];

            // 3. Fetch Realtime Stats (Trend & Counts)
            const { data: trendData } = await supabase.rpc('get_user_accuracy_trend', { p_user_id: user.id });
            const { data: topicCounts } = await supabase.rpc('get_topic_pattern_counts');

            // 4. Fetch Stamina Curve & Sprint Performance (parallel)
            const [staminaData, sprintData] = await Promise.all([
                fetchStaminaCurve(),
                fetchSprintPerformance()
            ]);

            // --- Compute Stats ---

            // Patterns
            const verifiedPatterns = patternData.filter(p => p.mastery_level === 'verified').length;
            const learningPatterns = patternData.filter(p => p.mastery_level === 'learning').length;
            const totalPatternsSeen = patternData.length;
            const debtPatterns = patternData.filter(p => p.is_in_debt);

            // Speed Score
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

            // Topic Stats Aggregation
            // 1. Filter collected exams
            const selectedExams = EXAM_TAXONOMY.filter(e => targetExams.includes(e.value));

            // 2. Collect all topics
            let allTopics: TopicDef[] = [];
            selectedExams.forEach(exam => {
                allTopics = [...allTopics, ...exam.topics];
            });

            // 3. Filter by Class
            // Logic: 
            // - Class 11 -> Show ONLY class_level === '11' (or undefined if we assume universal? No, let's be strict or assume 11 is default)
            // - Class 12 / Reappear -> Show ALL
            const filteredTopics = allTopics.filter(topic => {
                if (userClass === '11') {
                    // Check if topic is explicitly linked to 11
                    return topic.class_level === '11';
                }
                // For 12/Reappear, show everything
                return true;
            });

            const topicStats: TopicStats[] = filteredTopics.map(topic => {
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

            // Compute Sprint Summary
            const sprintSummary = sprintData && sprintData.length > 0 ? {
                totalSprints: sprintData.length,
                bestScore: Math.max(...sprintData.map(s => Math.round(s.accuracy))),
                avgAccuracy: Math.round(sprintData.reduce((sum, s) => sum + s.accuracy, 0) / sprintData.length),
                recentSprints: sprintData.slice(0, 5)
            } : null;

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
                staminaCurve: staminaData || [],
                sprintSummary,
                user,
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
