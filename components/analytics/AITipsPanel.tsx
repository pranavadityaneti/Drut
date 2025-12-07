import React, { useState, useEffect } from 'react';
import { generateAITips } from '../../services/vertexBackendService';
import { fetchUserAnalytics, fetchWeakestSubtopics, fetchDistractorAnalysis } from '../../services/analyticsService';

export const AITipsPanel: React.FC = () => {
    const [tips, setTips] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadTips = async () => {
            try {
                const [analytics, weakest, distractors] = await Promise.all([
                    fetchUserAnalytics(),
                    fetchWeakestSubtopics(3),
                    fetchDistractorAnalysis()
                ]);

                const generatedTips = await generateAITips({
                    totalAttempts: analytics.total_attempts,
                    accuracy: analytics.accuracy_pct,
                    avgTimeMs: analytics.avg_time_ms,
                    weakestSubtopics: weakest.map(w => ({ subtopic: w.subtopic, accuracy: w.accuracy })),
                    distractors: distractors
                });

                setTips(generatedTips);
            } catch (err) {
                console.error('Failed to load tips:', err);
                setTips(['Keep practicing!', 'Review your mistakes', 'Focus on weak areas']);
            } finally {
                setIsLoading(false);
            }
        };

        loadTips();
    }, []);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg group hover:bg-blue-100 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">{tip}</p>
                </div>
            ))}
        </div>
    );
};
