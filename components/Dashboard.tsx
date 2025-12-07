import React, { useState, useEffect } from 'react';
import { fetchUserAnalytics, fetchTopicProficiency, fetchLearningVelocity, fetchSprintPerformance, fetchWeakestSubtopics, fetchActivityHeatmap, fetchDistractorAnalysis, fetchStaminaCurve, AnalyticsRow, TopicProficiency, LearningVelocity, SprintPerformance, WeakestSubtopic, ActivityHeatmap, DistractorData, StaminaPoint } from '../services/analyticsService';
import { ProficiencyRadar } from './analytics/ProficiencyRadar';
import { VelocityChart } from './analytics/VelocityChart';
import { SprintScatter } from './analytics/SprintScatter';
import { WeakestLinkCard } from './analytics/WeakestLinkCard';
import { ActivityHeatmapGrid } from './analytics/ActivityHeatmapGrid';
import { DistractorAnalysis } from './analytics/DistractorAnalysis';
import { StaminaCurve } from './analytics/StaminaCurve';
import { AITipsPanel } from './analytics/AITipsPanel';
import { supabase } from '../lib/supabase';

export const Dashboard: React.FC<{}> = () => {
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [topicData, setTopicData] = useState<TopicProficiency[]>([]);
  const [velocityData, setVelocityData] = useState<LearningVelocity[]>([]);
  const [sprintData, setSprintData] = useState<SprintPerformance[]>([]);
  const [weakestData, setWeakestData] = useState<WeakestSubtopic[]>([]);
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmap[]>([]);
  const [distractorData, setDistractorData] = useState<DistractorData[]>([]);
  const [staminaData, setStaminaData] = useState<StaminaPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>('User');

  useEffect(() => {
    const loadUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get name from user metadata, fallback to email
        const name = user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User';
        setUserName(name);
      }
    };
    loadUserName();
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [stats, topics, velocity, sprint, weakest, heatmap, distractors, stamina] = await Promise.all([
          fetchUserAnalytics(),
          fetchTopicProficiency(),
          fetchLearningVelocity(),
          fetchSprintPerformance(),
          fetchWeakestSubtopics(),
          fetchActivityHeatmap(),
          fetchDistractorAnalysis(),
          fetchStaminaCurve()
        ]);

        setAnalytics(stats);
        setTopicData(topics);
        setVelocityData(velocity);
        setSprintData(sprint);
        setWeakestData(weakest);
        setHeatmapData(heatmap);
        setDistractorData(distractors);
        setStaminaData(stamina);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  return (
    <div className="p-8 max-w-[1800px] mx-auto">

      {/* Header Section: Greeting */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Good Morning, {userName}</h1>
        <p className="text-gray-400 mt-1">Here is your daily progress overview</p>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-12 gap-6">

        {/* LEFT COLUMN: Charts */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* Stamina Curve */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <h3 className="font-bold text-lg text-foreground mb-4">Stamina Curve</h3>
            <p className="text-xs text-gray-500 mb-4">Performance across your latest sprint session</p>
            <StaminaCurve data={staminaData} />
          </div>

          {/* Row: Reaction Time + Distractor Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reaction Time (using avg time from analytics) */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
              <h3 className="font-bold text-lg text-foreground mb-4">Reaction Time</h3>
              <div className="h-32 flex flex-col items-center justify-center">
                <span className="text-6xl font-bold text-primary">{analytics ? Math.round(analytics.avg_time_ms / 1000) : 0}s</span>
                <p className="text-sm text-gray-500 mt-2">Average per question</p>
              </div>
            </div>

            {/* Distractor Analysis */}
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
              <h3 className="font-bold text-lg text-foreground mb-4">Distractor Analysis</h3>
              <p className="text-xs text-gray-500 mb-4">Most tempting wrong answers</p>
              <div className="max-h-64 overflow-y-auto">
                <DistractorAnalysis data={distractorData} />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Stat Cards + AI Tips */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* Card 1: Total Questions (Purple) */}
          <div className="bg-purple-soft p-6 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary/60">Total Practice</span>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Questions Attempted</h3>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-bold text-foreground">{analytics?.total_attempts || 0}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Accuracy (Blue) */}
          <div className="bg-blue-soft p-6 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500/60">Performance</span>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Accuracy Rate</h3>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-bold text-foreground">{analytics?.accuracy_pct || 0}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Skips/Timeout (Orange) */}
          <div className="bg-orange-50 p-6 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-500/60">Sprint Stats</span>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Skips/Timeout</h3>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-bold text-foreground">
                  {sprintData.length > 0 ? Math.round(sprintData[0].total_questions - sprintData[0].accuracy * sprintData[0].total_questions / 100) : 0}
                </span>
              </div>
            </div>
          </div>

          {/* AI Tips Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="font-bold text-lg text-foreground">AI Tips</h3>
            </div>
            <AITipsPanel />
          </div>

        </div>
      </div>
    </div>
  );
};
