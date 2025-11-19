import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/Card';
import { fetchUserAnalytics, AnalyticsRow } from '../services/analyticsService';
import { useModal } from './ui/Modal';
import { classifySupabaseError } from '../lib/supabaseError';

// Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const MoreVerticalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>;

export const Dashboard: React.FC<{}> = () => {
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { openModal } = useModal();

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const stats = await fetchUserAnalytics();
        setAnalytics(stats);
      } catch (err: any) {
        // Silent fail for UI demo, or log error
        console.error("Failed to load analytics", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Main Content Area (Left) */}
      <div className="col-span-12 lg:col-span-8 space-y-8">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-primary text-white p-8 md:p-10 shadow-lg shadow-primary/20">
          <div className="relative z-10 max-w-lg">
            <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase bg-white/20 rounded-full backdrop-blur-sm">
              Online Course
            </div>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              Sharpen Your Skills with <br /> Professional Online Courses
            </h1>
            <button className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-900 transition-colors">
              Join Now
              <div className="bg-white/20 rounded-full p-1">
                <ChevronRightIcon />
              </div>
            </button>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 right-20 w-32 h-32 bg-blue-400/30 rounded-full blur-2xl"></div>

          {/* Star Decorations */}
          <svg className="absolute top-10 right-10 h-12 w-12 text-purple-300/50 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
          <svg className="absolute bottom-10 right-1/4 h-8 w-8 text-blue-300/50" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="UI/UX Design"
            subtitle="2/8 watched"
            icon={<div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg></div>}
          />
          <StatCard
            title="Branding"
            subtitle="3/8 watched"
            icon={<div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg></div>}
          />
          <StatCard
            title="Front End"
            subtitle="6/12 watched"
            icon={<div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div>}
          />
        </div>

        {/* Continue Watching Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Continue Watching</h2>
            <div className="flex gap-2">
              <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-foreground transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <button className="p-2 rounded-full bg-primary text-white shadow-md shadow-primary/30"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CourseCard
              category="FRONT END"
              title="Beginner's Guide to Becoming a Professional Front-End Developer"
              author="Leonardo samsul"
              role="Mentor"
              image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80"
              avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Leo"
            />
            <CourseCard
              category="UI/UX DESIGN"
              title="Optimizing User Experience with the Best UI/UX Design"
              author="Bayu Salto"
              role="Mentor"
              image="https://images.unsplash.com/photo-1586717791821-3f44a5638d48?auto=format&fit=crop&w=600&q=80"
              avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Bayu"
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar (Stats & Mentors) */}
      <div className="col-span-12 lg:col-span-4 space-y-8">

        {/* Statistic Chart Card */}
        <div className="bg-white p-6 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Statistic</h3>
            <button><MoreVerticalIcon /></button>
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#F3F4F6" strokeWidth="8" fill="none" />
                <circle cx="64" cy="64" r="56" stroke="#6C5DD3" strokeWidth="8" fill="none" strokeDasharray="351.86" strokeDashoffset="100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jason" className="w-20 h-20 rounded-full bg-gray-100" alt="User" />
              </div>
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">32%</div>
            </div>
            <h4 className="mt-4 font-bold text-lg">Good Morning Jason🔥</h4>
            <p className="text-sm text-gray-400 text-center mt-1">Continue your learning to achieve your target!</p>
          </div>

          {/* Simple Bar Chart */}
          <div className="flex items-end justify-between h-32 gap-2 mt-4">
            {['1-10 Aug', '11-20 Aug', '21-30 Aug'].map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-1/3">
                <div className={`w-full rounded-t-xl ${i === 1 ? 'bg-primary h-24' : 'bg-purple-100 h-12'}`}></div>
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Your Mentor List */}
        <div className="bg-white p-6 rounded-3xl shadow-card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Your mentor</h3>
            <button className="p-1 rounded-full border border-gray-200"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
          </div>

          <div className="space-y-6">
            <MentorRow name="Padhang Satrio" role="Mentor" seed="Padhang" />
            <MentorRow name="Zakir Horizontal" role="Mentor" seed="Zakir" />
            <MentorRow name="Leonardo Samsul" role="Mentor" seed="Leo" />
          </div>

          <button className="w-full mt-6 py-3 bg-purple-50 text-primary font-semibold rounded-xl hover:bg-purple-100 transition-colors">
            See All
          </button>
        </div>

      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, subtitle: string, icon: React.ReactNode }> = ({ title, subtitle, icon }) => (
  <div className="bg-white p-4 rounded-2xl shadow-card flex items-center gap-4 transition-transform hover:-translate-y-1">
    {icon}
    <div>
      <p className="text-xs text-gray-400 font-medium mb-1">{subtitle}</p>
      <h4 className="font-bold text-foreground">{title}</h4>
    </div>
    <button className="ml-auto text-gray-300 hover:text-gray-500"><MoreVerticalIcon /></button>
  </div>
);

const CourseCard: React.FC<{ category: string, title: string, author: string, role: string, image: string, avatar: string }> = ({ category, title, author, role, image, avatar }) => (
  <div className="bg-white p-4 rounded-3xl shadow-card group cursor-pointer hover:shadow-soft transition-all">
    <div className="relative h-40 rounded-2xl overflow-hidden mb-4">
      <img src={image} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
      <button className="absolute top-3 right-3 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-black/50">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
      </button>
    </div>
    <div className="px-2">
      <span className={`text-[10px] font-bold px-2 py-1 rounded-md mb-3 inline-block ${category === 'FRONT END' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
        {category}
      </span>
      <h3 className="font-bold text-foreground leading-snug mb-4 line-clamp-2">{title}</h3>
      <div className="flex items-center gap-3">
        <img src={avatar} alt={author} className="w-8 h-8 rounded-full bg-gray-100" />
        <div>
          <p className="text-xs font-bold text-foreground">{author}</p>
          <p className="text-[10px] text-gray-400">{role}</p>
        </div>
      </div>
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
