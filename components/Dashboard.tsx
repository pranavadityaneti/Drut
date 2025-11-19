import React, { useState, useEffect } from 'react';
import { fetchUserAnalytics, fetchTopicProficiency, fetchLearningVelocity, fetchSprintPerformance, fetchWeakestSubtopics, fetchActivityHeatmap, AnalyticsRow, TopicProficiency, LearningVelocity, SprintPerformance, WeakestSubtopic, ActivityHeatmap } from '../services/analyticsService';
import { ProficiencyRadar } from './analytics/ProficiencyRadar';
import { VelocityChart } from './analytics/VelocityChart';
import { SprintScatter } from './analytics/SprintScatter';
import { WeakestLinkCard } from './analytics/WeakestLinkCard';
import { ActivityHeatmapGrid } from './analytics/ActivityHeatmapGrid';

// Icons
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const MoreVerticalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>;

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
    <div className="grid grid-cols-12 gap-8 pb-10">
      {/* Main Content Area (Left) */}
      <div className="col-span-12 lg:col-span-8 space-y-8">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-primary text-white p-8 md:p-10 shadow-lg shadow-primary/20">
          <div className="relative z-10 max-w-lg">
            <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase bg-white/20 rounded-full backdrop-blur-sm">
              Analytics Dashboard
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              Track Your Progress & <br /> Master Every Topic
            </h1>
            <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-900 transition-colors">
              Start Practice
              <div className="bg-white/20 rounded-full p-1">
                <ChevronRightIcon />
              </div>
            </button>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-blue-400/30 rounded-full blur-2xl"></div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Questions"
            value={analytics?.total_attempts || 0}
            icon={<div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>}
          />
          <StatCard
            title="Accuracy Rate"
            value={`${analytics?.accuracy_pct || 0}%`}
            icon={<div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>}
          />
          <StatCard
            title="Avg Time"
            value={`${((analytics?.avg_time_ms || 0) / 1000).toFixed(1)}s`}
            icon={<div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>}
          />
        </div>

        {/* Charts Row 1: Velocity & Radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Learning Velocity</h3>
              <button><MoreVerticalIcon /></button>
            </div>
            <VelocityChart data={velocityData} />
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Topic Proficiency</h3>
              <button><MoreVerticalIcon /></button>
            </div>
            <ProficiencyRadar data={topicData} />
          </div>
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmapGrid data={heatmapData} />

      </div>

      {/* Right Sidebar */}
      <div className="col-span-12 lg:col-span-4 space-y-8">

        {/* Weakest Link Alert */}
        <WeakestLinkCard data={weakestData} />

        {/* Sprint Performance Scatter */}
        <div className="bg-white p-6 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Sprint Performance</h3>
            <button><MoreVerticalIcon /></button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Speed vs. Accuracy in recent sessions</p>
          <SprintScatter data={sprintData} />
        </div>

        {/* Mentor List (Static for now) */}
        <div className="bg-white p-6 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Top Mentors</h3>
            <button className="p-1 rounded-full border border-gray-200"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
          </div>
          <div className="space-y-6">
            <MentorRow name="Padhang Satrio" role="Math Expert" seed="Padhang" />
            <MentorRow name="Zakir Horizontal" role="Physics Lead" seed="Zakir" />
          </div>
          <button className="w-full mt-6 py-3 bg-purple-50 text-primary font-semibold rounded-xl hover:bg-purple-100 transition-colors">
            See All
          </button>
        </div>

      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-2xl shadow-card flex items-center gap-4 transition-transform hover:-translate-y-1">
    {icon}
    <div>
      <p className="text-xs text-gray-400 font-medium mb-1">{title}</p>
      <h4 className="font-bold text-xl text-foreground">{value}</h4>
    </div>
  </div>
);

const MentorRow: React.FC<{ name: string, role: string, seed: string }> = ({ name, role, seed }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="relative">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} className="w-10 h-10 rounded-full bg-gray-100" alt={name} />
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-black rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[6px] text-white font-bold">+</span>
        </div>
      </div>
      <div>
        <h5 className="font-bold text-sm text-foreground">{name}</h5>
        <p className="text-xs text-gray-400">{role}</p>
      </div>
    </div>
    <button className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1">
      + Follow
    </button>
  </div>
);
