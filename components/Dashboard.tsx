import React, { useState, useEffect, useMemo } from 'react';
import { EXAM_SPECIFIC_TOPICS, EXAM_PROFILES } from '../constants';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { getPerformanceHistory, clearPerformanceHistory } from '../services/performanceService';
import { PerformanceRecord } from '../types';
import { PersonalizedTopic } from '../App';

interface SubTopicStats {
  total: number;
  correct: number;
  totalTime: number;
}

interface TopicStats {
  total: number;
  correct: number;
  totalTime: number;
  subTopics: { [key: string]: SubTopicStats };
}

interface DashboardProps {
    onStartPersonalizedSession: (topics: PersonalizedTopic[]) => void;
}

const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M3 3v18h18"/><path d="M18 17.5v-11a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/><path d="M13 17.5v-5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/><path d="M8 17.5v-8a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5z"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary mx-auto"><path d="M12 5V2M12 22v-3"/><path d="M17 9a5 5 0 0 1-10 0"/><path d="M5 14a2.5 2.5 0 0 1 5 0"/><path d="M14 14a2.5 2.5 0 0 1 5 0"/><path d="M2 14h1.5"/><path d="M20.5 14H22"/><path d="M9 14h6"/><path d="M5 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M15 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>;

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

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const safeValue = Math.max(0, Math.min(100, value));
    const colorClass = safeValue > 75 ? 'bg-green-500' : safeValue > 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="w-full bg-secondary rounded-full h-2">
            <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${safeValue}%` }}></div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ onStartPersonalizedSession }) => {
  const [examProfile, setExamProfile] = useState<string>(() => localStorage.getItem('examProfile') || EXAM_PROFILES[0].value);
  const [topic, setTopic] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<{ value: string; label: string }[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [history, setHistory] = useState<PerformanceRecord[]>([]);

  useEffect(() => {
    setHistory(getPerformanceHistory());
  }, []);

  useEffect(() => {
    const newTopics = EXAM_SPECIFIC_TOPICS[examProfile] || [];
    setAvailableTopics(newTopics);

    const savedTopic = localStorage.getItem('topic');
    if (savedTopic && newTopics.some(t => t.value === savedTopic)) {
      setTopic(savedTopic);
    } else {
      setTopic(newTopics.length > 0 ? newTopics[0].value : '');
    }
  }, [examProfile]);

  const handleExamProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExamProfile(e.target.value);
  };

  const handleSave = () => {
    localStorage.setItem('examProfile', examProfile);
    localStorage.setItem('topic', topic);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };
  
  const handleResetStats = () => {
    if (typeof window !== 'undefined' && window.confirm("Are you sure you want to delete all your performance history? This action cannot be undone.")) {
      clearPerformanceHistory();
      setHistory([]);
    }
  };

  const stats = useMemo(() => {
    if (history.length === 0) {
      return null;
    }

    const totalQuestions = history.length;
    const correctAnswers = history.filter(r => r.isCorrect).length;
    const totalTime = history.reduce((sum, r) => sum + r.timeTaken, 0);

    const topicBreakdown: { [key: string]: TopicStats } = {};
    
    for (const record of history) {
        if (!topicBreakdown[record.topic]) {
            topicBreakdown[record.topic] = { total: 0, correct: 0, totalTime: 0, subTopics: {} };
        }
        if (!topicBreakdown[record.topic].subTopics[record.subTopic]) {
            topicBreakdown[record.topic].subTopics[record.subTopic] = { total: 0, correct: 0, totalTime: 0 };
        }
        
        topicBreakdown[record.topic].total++;
        topicBreakdown[record.topic].subTopics[record.subTopic].total++;
        topicBreakdown[record.topic].totalTime += record.timeTaken;
        topicBreakdown[record.topic].subTopics[record.subTopic].totalTime += record.timeTaken;
        
        if (record.isCorrect) {
            topicBreakdown[record.topic].correct++;
            topicBreakdown[record.topic].subTopics[record.subTopic].correct++;
        }
    }

    return {
      totalQuestions,
      accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      avgTime: totalQuestions > 0 ? totalTime / totalQuestions : 0,
      topicBreakdown,
    };
  }, [history]);

  const personalizedSuggestions = useMemo(() => {
    if (!stats) return [];
    
    const MIN_QUESTIONS = 3;
    const MAX_ACCURACY = 60; // Suggest topics with accuracy below this
    
    const weakSubTopics: { topic: string; subTopic: string; accuracy: number; total: number }[] = [];
    
    Object.entries(stats.topicBreakdown).forEach(([topicName, topicData]) => {
      const typedTopicData = topicData as TopicStats;
      Object.entries(typedTopicData.subTopics).forEach(([subTopicName, subTopicData]) => {
        const typedSubTopicData = subTopicData as SubTopicStats;
        if (typedSubTopicData.total >= MIN_QUESTIONS) {
          const accuracy = (typedSubTopicData.correct / typedSubTopicData.total) * 100;
          if (accuracy < MAX_ACCURACY) {
            weakSubTopics.push({
              topic: topicName,
              subTopic: subTopicName,
              accuracy: accuracy,
              total: typedSubTopicData.total,
            });
          }
        }
      });
    });
    
    // Sort by lowest accuracy first
    return weakSubTopics.sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
  }, [stats]);


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Your Preferences</CardTitle>
          <CardDescription>
            Select your default exam and topic for practice sessions. Your choices will be saved for your next visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Exam Profile</label>
            <Select options={EXAM_PROFILES} value={examProfile} onChange={handleExamProfileChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Quantitative Topic</label>
            <Select 
              options={availableTopics} 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)}
              disabled={!examProfile || availableTopics.length === 0}
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={handleSave} disabled={!topic}>Save Preferences</Button>
            {isSaved && <p className="text-sm text-green-600 animate-pulse">Preferences saved!</p>}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Personalized Learning Path</CardTitle>
          <CardDescription>
            Our AI has identified areas where you can improve. Start a focused session to sharpen your skills.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {personalizedSuggestions.length > 0 ? (
                <div className="space-y-4">
                    <h4 className="font-medium text-secondary-foreground">Recommended Focus Areas:</h4>
                    <ul className="space-y-3">
                        {personalizedSuggestions.map(({ topic, subTopic, accuracy, total }) => (
                            <li key={`${topic}-${subTopic}`} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                                <div>
                                    <p className="font-semibold">{subTopic}</p>
                                    <p className="text-sm text-muted-foreground">{topic}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-destructive">{accuracy.toFixed(0)}%</p>
                                    <p className="text-xs text-muted-foreground">({total} Qs)</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Button 
                        onClick={() => onStartPersonalizedSession(personalizedSuggestions.map(s => ({topic: s.topic, subTopic: s.subTopic})))}
                        className="w-full mt-4"
                    >
                       Start Personalized Session
                    </Button>
                </div>
            ) : (
                <div className="text-center py-8">
                    <BrainCircuitIcon />
                    <h4 className="mt-4 font-semibold">Keep Practicing!</h4>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Answer more questions to get personalized recommendations. We need a bit more data to identify your strengths and weaknesses.
                    </p>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Your performance across all practice sessions.</CardDescription>
            </div>
            {stats && <Button onClick={handleResetStats} className="bg-destructive/10 text-destructive hover:bg-destructive/20"><TrashIcon/>Reset Stats</Button>}
        </CardHeader>
        <CardContent>
            {!stats ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No practice data yet. Go to the 'Practice' tab to answer some questions!</p>
                </div>
            ) : (
                <div className="space-y-8 pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <StatCard title="Overall Accuracy" value={`${stats.accuracy.toFixed(1)}%`} icon={<TargetIcon />} />
                        <StatCard title="Average Time" value={`${stats.avgTime.toFixed(1)}s`} icon={<ClockIcon />} />
                        <StatCard title="Questions Answered" value={stats.totalQuestions} icon={<ChartBarIcon />} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-primary">Breakdown by Topic</h3>
                        <div className="space-y-4">
                            {Object.entries(stats.topicBreakdown).map(([topicName, data]) => {
                                const topicData = data as TopicStats;
                                const topicAccuracy = topicData.total > 0 ? (topicData.correct / topicData.total) * 100 : 0;
                                return (
                                <Card key={topicName} className="overflow-hidden">
                                    <CardHeader>
                                        <CardTitle className="text-base">{topicName}</CardTitle>
                                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                            <span>{topicData.total} Qs</span>
                                            <span>|</span>
                                            <span>{topicAccuracy.toFixed(1)}% Acc.</span>
                                            <span>|</span>
                                            <span>{(topicData.totalTime / topicData.total).toFixed(1)}s Avg.</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <ul className="space-y-3">
                                            {Object.entries(topicData.subTopics).map(([subTopicName, subData]) => {
                                                const subTopicData = subData as SubTopicStats;
                                                const subTopicAccuracy = subTopicData.total > 0 ? (subTopicData.correct / subTopicData.total) * 100 : 0;
                                                return (
                                                <li key={subTopicName} className="p-3 bg-secondary/50 rounded-md">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="font-medium text-secondary-foreground">{subTopicName}</span>
                                                        <span className="text-xs font-mono text-muted-foreground">{subTopicData.correct}/{subTopicData.total}</span>
                                                    </div>
                                                    <ProgressBar value={subTopicAccuracy} />
                                                </li>
                                                )
                                            })}
                                        </ul>
                                    </CardContent>
                                </Card>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
