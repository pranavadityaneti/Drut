/**
 * Command Center Dashboard
 * 
 * Modern redesigned dashboard with welcome header and card menus
 */

import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@drut/shared'; // from ../hooks/useDashboardData';
import { SpeedPulse } from './dashboard/SpeedPulse';
import { DebtCollector } from './dashboard/DebtCollector';
import { MasteryGrid } from './dashboard/MasteryGrid';
import { WeakSpotsWidget } from './dashboard/WeakSpotsWidget';
import { WelcomeHeader } from './dashboard/WelcomeHeader';
import { DashboardBanner } from './dashboard/DashboardBanner';
import { DashboardStatsRow } from './dashboard/DashboardStatsRow';
import { StaminaCurve } from './analytics/StaminaCurve';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Loader2, Activity, Zap } from 'lucide-react';
import { supabase } from '@drut/shared';

export const Dashboard: React.FC = () => {
  const { data, loading, error, refetch } = useDashboardData();
  const [userName, setUserName] = useState('there');

  // Get user name
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';
        setUserName(name);
      }
    };
    fetchUser();
  }, []);

  // Export performance report
  const handleExport = () => {
    // Generate and download performance report
    const report = {
      exportDate: new Date().toISOString(),
      speedScore: data?.speedScore ?? 0,
      speedRating: data?.speedRating ?? 'Rookie',
      verifiedPatterns: data?.verifiedPatterns ?? 0,
      totalPatternsSeen: data?.totalPatternsSeen ?? 0,
      debtPatterns: data?.debtPatterns?.length ?? 0,
      topicBreakdown: data?.topicStats?.map(t => ({
        topic: t.topic.label,
        progress: t.progressPercent,
        verified: t.verifiedPatterns
      })) ?? [],
      sprintSummary: data?.sprintSummary ?? null
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drut-performance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle debt clearing (placeholder)
  const handleClearDebt = () => {
    console.log('Starting Debt Session...');
    // TODO: Navigate to debt-focused practice session
  };

  // Handle topic click
  const handleTopicClick = (topicValue: string) => {
    console.log('Opening topic:', topicValue);
    // TODO: Navigate to topic-focused practice
  };

  // Handle practice from weak spots
  const handlePracticeWeakSpot = (subtopic: string, topic: string) => {
    console.log('Practice weak spot:', subtopic, 'in topic:', topic);
    // TODO: Navigate to subtopic-focused practice
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading dashboard</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Default values if no data
  const speedScore = data?.speedScore ?? 0;
  const speedRating = data?.speedRating ?? 'Rookie';
  const speedTrend = data?.speedTrend ?? 0;
  const verifiedPatterns = data?.verifiedPatterns ?? 0;
  const totalPatterns = data?.totalPatternsSeen ?? 0;
  const debtPatterns = data?.debtPatterns ?? [];
  const topicStats = data?.topicStats ?? [];
  const staminaCurve = data?.staminaCurve ?? [];
  const sprintSummary = data?.sprintSummary;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 md:p-8">
      {/* Welcome Header */}
      <WelcomeHeader userName={userName} onExport={handleExport} />

      <DashboardBanner userName={userName} />
      <DashboardStatsRow />

      {/* 
        ROW 1: Stats & Widgets
        Desktop: 12-column Grid (4-4-4 split)
        Mobile: 1 column stack
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-8 items-stretch">
        <WeakSpotsWidget
          onPractice={handlePracticeWeakSpot}
          className="h-full lg:col-span-4"
        />
        <SpeedPulse
          score={speedScore}
          rating={speedRating}
          trend={speedTrend}
          verifiedCount={verifiedPatterns}
          totalCount={totalPatterns}
          className="h-full lg:col-span-4"
          onRefresh={refetch}
        />
        <DebtCollector
          patterns={debtPatterns}
          onClearDebt={handleClearDebt}
          onRefresh={refetch}
          className="md:col-span-2 lg:col-span-4 h-full"
        />
      </div>

      {/* 
        ROW 2: Mastery Grid
        Full width
      */}
      <div className="w-full">
        <MasteryGrid
          topicStats={topicStats}
          onTopicClick={handleTopicClick}
        />
      </div>

      {/*
        ROW 3: Sprint Summary + Stamina Curve
        Two columns on desktop
      */}
      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
        {/* Sprint Summary — Left Side */}
        <Card className="h-full group">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[14px] tracking-tight">
              <Zap className="w-4 h-4 text-[var(--color-ink-3)]" />
              Sprint summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sprintSummary ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="relative p-4 rounded-[14px] bg-[var(--color-muted)]">
                  <p className="label-uppercase">Total</p>
                  <p className="text-[26px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-ink-1)] mt-1.5">
                    {sprintSummary.totalSprints}
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-3)] mt-1.5">Sprints completed</p>
                </div>
                <div className="relative p-4 rounded-[14px] bg-[var(--color-muted)] ring-hairline-strong overflow-hidden">
                  <p className="label-uppercase">Best score</p>
                  <p className="text-[26px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-accent-warm)] mt-1.5">
                    {sprintSummary.bestScore}%
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-3)] mt-1.5">Personal best</p>
                  {/* Coral underline (featured slot) */}
                  <span
                    aria-hidden
                    className="absolute left-4 right-4 bottom-0 h-[2px] rounded-full bg-[var(--color-accent-warm)] origin-center scale-x-[0.5] transition-transform duration-400 ease-out group-hover:scale-x-100"
                  />
                </div>
                <div className="relative p-4 rounded-[14px] bg-[var(--color-muted)]">
                  <p className="label-uppercase">Avg accuracy</p>
                  <p className="text-[26px] leading-none font-bold tracking-[-0.02em] num-tabular text-[var(--color-ink-1)] mt-1.5">
                    {sprintSummary.avgAccuracy}%
                  </p>
                  <p className="text-[11px] text-[var(--color-ink-3)] mt-1.5">Across sprints</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-ink-3)] mb-2">
                  <Zap className="w-4 h-4" />
                </span>
                <p className="text-[13px] text-[var(--color-ink-3)]">
                  Start a sprint to see your summary.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stamina Curve — Right Side */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[14px] tracking-tight">
              <Activity className="w-4 h-4 text-[var(--color-ink-3)]" />
              Stamina curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StaminaCurve data={staminaCurve} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

