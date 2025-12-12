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

// Mock Data for Dashboard
const MOCK_DATA: DashboardData = {
    speedScore: 78,
    speedRating: 'Pro',
    speedTrend: 12,
    totalPatternsSeen: 145,
    verifiedPatterns: 89,
    learningPatterns: 56,
    debtPatterns: [
        { id: '1', fsm_tag: 'algebra-logarithms-basic', mastery_level: 'learning', streak: 2, is_in_debt: true, last_practiced_at: new Date().toISOString() },
        { id: '2', fsm_tag: 'geometry-triangles-properties', mastery_level: 'learning', streak: 1, is_in_debt: true, last_practiced_at: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', fsm_tag: 'arithmetic-percentages-advanced', mastery_level: 'learning', streak: 0, is_in_debt: true, last_practiced_at: new Date(Date.now() - 172800000).toISOString() },
    ],
    debtCount: 3,
    topicStats: [
        {
            topic: { id: 'quant', label: 'Quantitative Aptitude', value: 'quant', subtopics: ['Arithmetic', 'Algebra', 'Geometry'] },
            totalPatterns: 50, verifiedPatterns: 30, learningPatterns: 20, progressPercent: 60
        },
        {
            topic: { id: 'varc', label: 'Verbal Ability', value: 'varc', subtopics: ['RC', 'Parajumbles'] },
            totalPatterns: 40, verifiedPatterns: 20, learningPatterns: 15, progressPercent: 50
        }
    ],
    patterns: []
};


// ============================================================
// Hook
// ============================================================

export function useDashboardData(useMockData: boolean = false) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [examProfile, setExamProfile] = useState<string>('cat');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (useMockData) {
                // Return Mock Data immediately
                // Simulate small delay for UI effect
                await new Promise(resolve => setTimeout(resolve, 500));
                setData(MOCK_DATA);
                setLoading(false);
                return;
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Not authenticated');
                return;
            }

            // Fetch user profile for exam preference
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('exam_profile')
                .eq('user_id', user.id)
                .single();

            const exam = profile?.exam_profile || 'cat';
            setExamProfile(exam);

            // Fetch all pattern mastery data
            const { data: patterns, error: patternsError } = await supabase
                .from('user_pattern_mastery')
                .select('*')
                .eq('user_id', user.id)
                .order('last_practiced_at', { ascending: false });

            if (patternsError) {
                throw new Error(patternsError.message);
            }

            const patternData = (patterns || []) as PatternMastery[];

            // Compute stats
            const verifiedPatterns = patternData.filter(p => p.mastery_level === 'verified').length;
            const learningPatterns = patternData.filter(p => p.mastery_level === 'learning').length;
            const totalPatternsSeen = patternData.length;
            const debtPatterns = patternData.filter(p => p.is_in_debt);

            // Speed Score: verified / total seen * 100
            const speedScore = totalPatternsSeen > 0
                ? Math.round((verifiedPatterns / totalPatternsSeen) * 100)
                : 0;

            // Speed Rating
            let speedRating: 'Rookie' | 'Learner' | 'Pro' | 'Elite' = 'Rookie';
            if (speedScore >= 86) speedRating = 'Elite';
            else if (speedScore >= 61) speedRating = 'Pro';
            else if (speedScore >= 31) speedRating = 'Learner';

            // Topic stats from taxonomy
            const examDef = getExam(exam);
            const topicStats: TopicStats[] = (examDef?.topics || []).map(topic => {
                // Count patterns in this topic (by fsm_tag containing topic keywords)
                const topicPatterns = patternData.filter(p => {
                    // Simple heuristic: check if fsm_tag relates to topic
                    const tagLower = p.fsm_tag.toLowerCase();
                    const topicLower = topic.value.toLowerCase();
                    return tagLower.includes(topicLower.split('-')[0]);
                });

                const verified = topicPatterns.filter(p => p.mastery_level === 'verified').length;
                const total = topic.subtopics.length; // Max possible patterns per topic

                return {
                    topic,
                    totalPatterns: total,
                    verifiedPatterns: verified,
                    learningPatterns: topicPatterns.filter(p => p.mastery_level === 'learning').length,
                    progressPercent: total > 0 ? Math.round((verified / total) * 100) : 0,
                };
            });

            setData({
                speedScore,
                speedRating,
                speedTrend: 12, // Mock for now (would need historical data)
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
    }, [useMockData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, examProfile, refetch: fetchData };
}
