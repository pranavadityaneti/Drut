import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { fetchUserAnalytics } from '../services/analyticsService';
import { AnalyticsRow } from '../types';

// NOTE: Topic/sub-topic analytics have been removed to align with the new, simpler server-side RPC.
// This can be added back when a topic-specific RPC is created.

const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M3 3v18h18"/><path d="M18 17.5v-11a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/><path d="M13 17.5v-5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/><path d="M8 17.5v-8a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary mx-auto"><path d="M12 5V2M12 22v-3"/><path d="M17 9a5 5 0 0 1-10 0"/><path d="M5 14a2.5 2.5 0 0 1 5 0"/><path d="M14 14a2.5 2.5 0 0 1 5 0"/><path d="M2 14h1.5"/><path d="M20.5 14H22"/><path d="M9 14h6"/><path d="M5 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M15 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>;
const RefreshCwIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2 animate-spin"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>

const StatCard: React.FC<{title: string, value: string | number, icon: React.ReactNode}> = ({ title, value, icon }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

// Personalized learning path and topic breakdowns have been temporarily removed
// as they require a more complex, topic-specific analytics RPC.
export const Dashboard: React.FC<{}> = () => {
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const stats = await fetchUserAnalytics();
        setAnalytics(stats);
    } catch (err: any) {
        // Display the specific error message from the service.
        setError(err.message ?? "Failed to load analytics data.");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const renderAnalytics = () => {
      if (isLoading) {
          return <div className="text-center py-8"><RefreshCwIcon /> Loading analytics...</div>
      }
      if (error) {
          return <div className="text-center py-8 text-destructive">{error}</div>
      }
      if (!analytics || analytics.total_attempts === 0) {
          return <div className="text-center py-8"><p className="text-muted-foreground">No practice data yet. Go to the 'Practice' tab to answer some questions!</p></div>
      }

      // The new service returns accuracy as a raw decimal (e.g., 0.66), so multiply by 100.
      const overallAccuracy = (analytics.accuracy * 100).toFixed(1);
      const averageTime = (analytics.avg_time_ms / 1000).toFixed(1);

      return (
        <div className="space-y-8 pt-4">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Overall Accuracy" value={`${overallAccuracy}%`} icon={<TargetIcon />} />
                <StatCard title="Average Time" value={`${averageTime}s`} icon={<ClockIcon />} />
                <StatCard title="Questions Answered" value={analytics.total_attempts} icon={<ChartBarIcon />} />
            </div>
            {/* Topic breakdown can be re-added here once a topic-specific RPC is available */}
        </div>
      )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Drut</CardTitle>
          <CardDescription>
            Your AI-powered learning dashboard. Your performance from the 'Practice' tab will appear here.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
             <CardTitle>Personalized Learning Path</CardTitle>
             <CardDescription>
                This feature is coming soon! As you practice, we'll analyze your results to suggest focus areas.
             </CardDescription>
        </CardHeader>
         <CardContent>
            <div className="text-center py-8">
                <BrainCircuitIcon />
                <h4 className="mt-4 font-semibold">Keep Practicing!</h4>
                <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                    Answer questions in the 'Practice' tab. Once we have enough data, this space will show your personalized recommendations.
                </p>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Your performance across all practice sessions.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            {renderAnalytics()}
        </CardContent>
      </Card>
    </div>
  );
};