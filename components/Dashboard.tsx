
import React, { useState, useEffect } from 'react';
import { EXAM_SPECIFIC_TOPICS, EXAM_PROFILES } from '../constants';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';

export const Dashboard: React.FC = () => {
  const [examProfile, setExamProfile] = useState<string>(() => localStorage.getItem('examProfile') || EXAM_PROFILES[0].value);
  const [topic, setTopic] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<{ value: string; label: string }[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const newTopics = EXAM_SPECIFIC_TOPICS[examProfile] || [];
    setAvailableTopics(newTopics);

    const savedTopic = localStorage.getItem('topic');
    // If the saved topic is valid for the current exam profile, use it.
    if (savedTopic && newTopics.some(t => t.value === savedTopic)) {
      setTopic(savedTopic);
    } else {
      // Otherwise, default to the first topic for the current profile.
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
            <Select 
              options={EXAM_PROFILES} 
              value={examProfile} 
              onChange={handleExamProfileChange} 
            />
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
              <CardTitle>How to Practice</CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-muted-foreground">
                  After saving your preferences, head over to the <span className="font-semibold text-primary">'Practice'</span> tab in the left navigation pane to start generating questions based on your selections.
              </p>
          </CardContent>
      </Card>
    </div>
  );
};
