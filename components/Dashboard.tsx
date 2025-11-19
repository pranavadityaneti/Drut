import React, { useState, useEffect } from 'react';
import { fetchUserAnalytics, fetchTopicProficiency, fetchLearningVelocity, fetchSprintPerformance, fetchWeakestSubtopics, fetchActivityHeatmap, AnalyticsRow, TopicProficiency, LearningVelocity, SprintPerformance, WeakestSubtopic, ActivityHeatmap } from '../services/analyticsService';
import { ProficiencyRadar } from './analytics/ProficiencyRadar';
import { VelocityChart } from './analytics/VelocityChart';
import { SprintScatter } from './analytics/SprintScatter';
import { WeakestLinkCard } from './analytics/WeakestLinkCard';
import { ActivityHeatmapGrid } from './analytics/ActivityHeatmapGrid';

// Icons
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const MoreVerticalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-on-surface-variant"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>;

export const Dashboard: React.FC<{}> = () => {
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [topicData, setTopicData] = useState<TopicProficiency[]>([]);
  const [velocityData, setVelocityData] = useState<LearningVelocity[]>([]);
  const [sprintData, setSprintData] = useState<SprintPerformance[]>([]);
  const [weakestData, setWeakestData] = useState<WeakestSubtopic[]>([]);
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [stats, topics, velocity, sprint, weakest, heatmap] = await Promise.all([
          fetchUserAnalytics(),
          fetchTopicProficiency(),
          fetchLearningVelocity(),
          fetchSprintPerformance(),
          fetchWeakestSubtopics(),
          fetchActivityHeatmap()
        ]);

        setAnalytics(stats);
        setTopicData(topics);
        setVelocityData(velocity);
        setSprintData(sprint);
        setWeakestData(weakest);
        setHeatmapData(heatmap);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  return (
    <div className="grid grid-cols-12 gap-6 pb-10 px-6">
      {/* Main Content Area (Left) */}
      <div className="col-span-12 lg:col-span-8 space-y-6">

        {/* Hero Banner - Filled Card */}
        <div className="relative overflow-hidden rounded-3xl bg-primary-container text-on-primary-container p-8 md:p-10">
          <div className="relative z-10 max-w-lg">
            <div className="inline-block px-3 py-1 mb-4 text-label-medium font-medium tracking-wider uppercase bg-white/40 rounded-full backdrop-blur-sm text-on-primary-container">
              Analytics Dashboard
            </div>
            <h1 className="text-display-small md:text-display-medium font-normal leading-tight mb-6">
              Track Your Progress & <br /> Master Every Topic
            </h1>
            <button className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-medium hover:shadow-elevation-2 transition-shadow">
              Start Practice
              <div className="bg-on-primary/20 rounded-full p-1">
                <ChevronRightIcon />
              </div>
            </button>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-secondary-container/50 rounded-full blur-2xl"></div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Questions"
            value={analytics?.total_attempts || 0}
            icon={<div className="p-3 bg-tertiary-container text-on-tertiary-container rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>}
          />
          <StatCard
            title="Accuracy Rate"
            value={`${analytics?.accuracy_pct || 0}%`}
            icon={<div className="p-3 bg-secondary-container text-on-secondary-container rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>}
          />
          <StatCard
            title="Avg Time"
            value={`${((analytics?.avg_time_ms || 0) / 1000).toFixed(1)}s`}
            icon={<div className="p-3 bg-primary-container text-on-primary-container rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
          />
        </div>

        {/* Charts Row 1: Velocity & Radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-border/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title-medium font-medium text-on-surface">Learning Velocity</h3>
              <button className="p-2 hover:bg-surface-variant rounded-full transition-colors"><MoreVerticalIcon /></button>
            </div>
            <VelocityChart data={velocityData} />
          </div>
          <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-border/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title-medium font-medium text-on-surface">Topic Proficiency</h3>
              <button className="p-2 hover:bg-surface-variant rounded-full transition-colors"><MoreVerticalIcon /></button>
            </div>
            <ProficiencyRadar data={topicData} />
          </div>
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmapGrid data={heatmapData} />

      </div>

      {/* Right Sidebar */}
      <div className="col-span-12 lg:col-span-4 space-y-6">

        {/* Weakest Link Alert */}
        <WeakestLinkCard data={weakestData} />

        {/* Sprint Performance Scatter */}
        <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-border/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-title-medium font-medium text-on-surface">Sprint Performance</h3>
            <button className="p-2 hover:bg-surface-variant rounded-full transition-colors"><MoreVerticalIcon /></button>
          </div>
          <p className="text-body-small text-on-surface-variant mb-4">Speed vs. Accuracy in recent sessions</p>
          <SprintScatter data={sprintData} />
        </div>

        {/* Mentor List (Static for now) */}
        <div className="bg-surface p-6 rounded-3xl shadow-elevation-1 border border-border/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-title-medium font-medium text-on-surface">Top Mentors</h3>
            <button className="p-2 rounded-full hover:bg-surface-variant transition-colors"><svg className="w-5 h-5 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
          </div>
          <div className="space-y-6">
            <MentorRow name="Padhang Satrio" role="Math Expert" seed="Padhang" />
            <MentorRow name="Zakir Horizontal" role="Physics Lead" seed="Zakir" />
          </div>
          <button className="w-full mt-6 py-3 bg-secondary-container text-on-secondary-container font-medium rounded-full hover:shadow-elevation-1 transition-all text-label-large">
            See All
          </button>
        </div>

      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-surface p-4 rounded-2xl shadow-elevation-1 border border-border/20 flex items-center gap-4 transition-transform hover:-translate-y-1">
    {icon}
    <div>
      <p className="text-label-medium text-on-surface-variant mb-1">{title}</p>
      <h4 className="text-headline-small font-normal text-on-surface">{value}</h4>
    </div>
  </div>
);

const MentorRow: React.FC<{ name: string, role: string, seed: string }> = ({ name, role, seed }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="relative">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} className="w-10 h-10 rounded-full bg-surface-variant" alt={name} />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-surface flex items-center justify-center">
          <span className="text-[6px] text-on-primary font-bold">+</span>
        </div>
      </div>
      <div>
        <h5 className="text-title-small font-medium text-on-surface">{name}</h5>
        <p className="text-body-small text-on-surface-variant">{role}</p>
      </div>
    </div>
    <button className="text-label-small font-medium text-primary hover:text-primary/80 flex items-center gap-1">
      + Follow
    </button>
  </div>
);
