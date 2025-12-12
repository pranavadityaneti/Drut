/**
 * Command Center Dashboard
 * 
 * 3-column responsive layout
 * Left: Arena | Center: Content | Right: Debt Collector
 */

import React from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { SpeedPulse } from './dashboard/SpeedPulse';
import { DebtCollector } from './dashboard/DebtCollector';
import { MasteryGrid } from './dashboard/MasteryGrid';
import { ArenaWidget } from './dashboard/ArenaWidget';
import { StaminaCurve } from './analytics/StaminaCurve';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Loader2, Activity } from 'lucide-react';
import { useSidebar } from './ui/AppShell';

export const Dashboard: React.FC = () => {
  const { data, loading, error, refetch } = useDashboardData();
  const { open: sidebarOpen } = useSidebar();

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

  return (
    <div className="space-y-8">
      {/* 
              Main grid layout - responsive
              Mobile: 1 column
              Tablet: 2 columns (Content + Debt)
              Desktop: 3 columns (Arena | Content | Debt)
              
              When sidebar collapses, the layout adjusts automatically via flex-1 in parent
            */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] xl:grid-cols-[280px_1fr_280px] gap-8">

        {/* Left Column - Arena (Desktop only) */}
        <div className="hidden xl:block">
          <ArenaWidget
            currentUserRank={4}
            currentUserScore={speedScore * 5}
          />
        </div>

        {/* Center Column - Main Content */}
        <div className="space-y-8">
          {/* Hero: Speed Pulse */}
          <SpeedPulse
            score={speedScore}
            rating={speedRating}
            trend={speedTrend}
            verifiedCount={verifiedPatterns}
            totalCount={totalPatterns}
          />

          {/* Mastery Grid */}
          <MasteryGrid
            topicStats={topicStats}
            onTopicClick={handleTopicClick}
          />

          {/* Stamina Curve */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-blue-600" />
                Stamina Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StaminaCurve />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Debt Collector */}
        <div className="md:sticky md:top-4 md:h-fit order-first md:order-last">
          <DebtCollector
            patterns={debtPatterns}
            onClearDebt={handleClearDebt}
          />
        </div>

      </div>

      {/* Tablet/Mobile: Show Arena below main content */}
      <div className="xl:hidden">
        <ArenaWidget
          currentUserRank={4}
          currentUserScore={speedScore * 5}
        />
      </div>
    </div>
  );
};

export default Dashboard;
