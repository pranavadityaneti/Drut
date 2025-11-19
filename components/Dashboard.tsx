import React, { useState, useEffect } from 'react';
import { fetchUserAnalytics, fetchTopicProficiency, fetchLearningVelocity, fetchSprintPerformance, fetchWeakestSubtopics, fetchActivityHeatmap, AnalyticsRow, TopicProficiency, LearningVelocity, SprintPerformance, WeakestSubtopic, ActivityHeatmap } from '../services/analyticsService';
import { ProficiencyRadar } from './analytics/ProficiencyRadar';
import { VelocityChart } from './analytics/VelocityChart';
import { SprintScatter } from './analytics/SprintScatter';
import { WeakestLinkCard } from './analytics/WeakestLinkCard';
import { ActivityHeatmapGrid } from './analytics/ActivityHeatmapGrid';

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
    <div className="p-8 max-w-[1600px] mx-auto">

      {/* Header Section: Greeting & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Good Morning, Royal</h1>
          <p className="text-gray-400 mt-1">Here is your daily progress overview</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start New Sprint
        </button>
      </div>

      <div className="grid grid-cols-12 gap-8">

        {/* Left Column: Stats & Main Charts */}
        <div className="col-span-12 lg:col-span-8 space-y-8">

          {/* Pastel Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Total Questions (Purple) */}
            <div className="bg-purple-soft p-8 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary/60">Total Practice</span>
                  <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                  <span className="text-xs font-medium text-primary/60">All Time</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Questions Attempted</h3>
                <p className="text-sm text-gray-500 mb-6">Keep pushing your limits!</p>

                <div className="flex items-end gap-4 mb-6">
                  <span className="text-5xl font-bold text-foreground">{analytics?.total_attempts || 0}</span>
                  <span className="text-sm font-medium text-green-500 mb-2 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    12%
                  </span>
                </div>

                <button className="bg-white text-primary px-6 py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all">
                  View Details
                </button>
              </div>
              {/* Decorative Blob */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
            </div>

            {/* Card 2: Accuracy (Blue) */}
            <div className="bg-blue-soft p-8 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-500/60">Performance</span>
                  <span className="w-1 h-1 rounded-full bg-blue-500/40"></span>
                  <span className="text-xs font-medium text-blue-500/60">Average</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Accuracy Rate</h3>
                <p className="text-sm text-gray-500 mb-6">Quality over quantity.</p>

                <div className="flex items-end gap-4 mb-6">
                  <span className="text-5xl font-bold text-foreground">{analytics?.accuracy_pct || 0}%</span>
                  <span className="text-sm font-medium text-green-500 mb-2 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    5%
                  </span>
                </div>

                <button className="bg-white text-blue-600 px-6 py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all">
                  View Analytics
                </button>
              </div>
              {/* Decorative Blob */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
            </div>
          </div>

          {/* Main Chart Section */}
          <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-foreground">Learning Velocity</h3>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="flex items-center gap-1 text-primary"><span className="w-2 h-2 rounded-full bg-primary"></span> Accuracy</span>
                  <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Volume</span>
                </div>
              </div>
              <select className="bg-gray-50 border-none text-xs font-medium text-gray-500 rounded-lg py-2 px-3 outline-none cursor-pointer hover:bg-gray-100">
                <option>Last 30 Days</option>
                <option>Last 7 Days</option>
                <option>All Time</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <VelocityChart data={velocityData} />
            </div>
          </div>

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
              <h3 className="font-bold text-lg text-foreground mb-4">Topic Proficiency</h3>
              <ProficiencyRadar data={topicData} />
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
              <h3 className="font-bold text-lg text-foreground mb-4">Activity Heatmap</h3>
              <ActivityHeatmapGrid data={heatmapData} />
            </div>
          </div>

        </div>

        {/* Right Column: Lists & Secondary Info */}
        <div className="col-span-12 lg:col-span-4 space-y-8">

          {/* Weakest Link (Refactored in separate file, but container here) */}
          <WeakestLinkCard data={weakestData} />

          {/* Sprint Performance */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-foreground">Sprint Speed</h3>
              <button className="text-gray-400 hover:text-foreground"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
            </div>
            <SprintScatter data={sprintData} />
          </div>

          {/* Mentors List */}
          <div className="bg-white p-6 rounded-3xl shadow-card border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-foreground">Your Mentors</h3>
              <a href="#" className="text-xs font-bold text-primary hover:underline">View All</a>
            </div>
            <div className="space-y-5">
              <MentorRow name="Padhang Satrio" role="Mathematics" seed="Padhang" time="10:00 AM" />
              <MentorRow name="Zakir Horizontal" role="Physics" seed="Zakir" time="11:30 AM" />
              <MentorRow name="Moinul Hasan" role="Chemistry" seed="Moinul" time="02:00 PM" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const MentorRow: React.FC<{ name: string, role: string, seed: string, time: string }> = ({ name, role, seed, time }) => (
  <div className="flex items-center justify-between group cursor-pointer">
    <div className="flex items-center gap-3">
      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100" alt={name} />
      <div>
        <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{name}</h5>
        <p className="text-xs text-gray-400">{role}</p>
      </div>
    </div>
    <div className="text-right">
      <span className="block text-xs font-bold text-foreground">{time}</span>
      <span className="text-[10px] text-gray-400">Today</span>
    </div>
  </div>
);
