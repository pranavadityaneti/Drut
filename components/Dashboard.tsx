/**
 * Command Center Dashboard
 * 
 * 3-column responsive layout
 * Left: Weak Spots | Center: Speed Pulse | Right: Debt Collector
 */

import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { SpeedPulse } from './dashboard/SpeedPulse';
import { DebtCollector } from './dashboard/DebtCollector';
import { MasteryGrid } from './dashboard/MasteryGrid';
import { WeakSpotsWidget } from './dashboard/WeakSpotsWidget';
import { StaminaCurve } from './analytics/StaminaCurve';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Loader2, Activity, Zap, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { data, loading, error, refetch } = useDashboardData();

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
    <div className="space-y-8 pb-12">
      {/* 
        ROW 1: Stats & Widgets
        Desktop: 12-column Grid (4-4-4 split)
        Mobile: 1 column stack
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-stretch">
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
        />
        <DebtCollector
          patterns={debtPatterns}
          onClearDebt={handleClearDebt}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sprint Summary - Left Side */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-amber-500" />
              Sprint Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sprintSummary ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{sprintSummary.totalSprints}</p>
                  <p className="text-xs text-muted-foreground">Total Sprints</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{sprintSummary.bestScore}%</p>
                  <p className="text-xs text-muted-foreground">Best Score</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{sprintSummary.avgAccuracy}%</p>
                  <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Zap className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Complete a sprint to see your stats
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stamina Curve - Right Side */}
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-blue-600" />
              Stamina Curve
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

