import React, { useState, useEffect } from 'react';
import { EXAM_SPECIFIC_TOPICS } from '../../constants';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';

interface SprintStartScreenProps {
    onStart: (config: { topic: string; subtopic: string; examProfile: string }) => void;
}

export const SprintStartScreen: React.FC<SprintStartScreenProps> = ({ onStart }) => {
    const [examProfile, setExamProfile] = useState<string>('');
    const [topics, setTopics] = useState<any[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [subtopics, setSubtopics] = useState<string[]>([]);
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');

    // Load exam profile from localStorage
    useEffect(() => {
        const profile = localStorage.getItem('examProfile');
        if (profile) {
            setExamProfile(profile);
            const topicsList = EXAM_SPECIFIC_TOPICS[profile] || [];
            setTopics(topicsList);
        }
    }, []);

    // Update subtopics when topic changes
    useEffect(() => {
        if (selectedTopic) {
            const topic = topics.find(t => t.value === selectedTopic);
            setSubtopics(topic?.subTopics || []);
            setSelectedSubtopic(''); // Reset subtopic
        }
    }, [selectedTopic, topics]);

    const handleStart = () => {
        if (!selectedTopic || !selectedSubtopic) return;
        onStart({ topic: selectedTopic, subtopic: selectedSubtopic, examProfile });
    };

    const canStart = selectedTopic && selectedSubtopic;

    return (
        <div className="max-w-2xl mx-auto mt-12 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-primary">Sprint Mode</h1>
                <p className="text-lg text-muted-foreground">
                    Rapid-fire practice with 45-second timer per question
                </p>
            </div>

            <Card>
                <CardContent className="p-6 space-y-6">
                    {/* Exam Profile Display */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">
                            Exam Profile
                        </label>
                        <div className="px-4 py-2 bg-accent rounded-md text-sm">
                            {examProfile || 'Not set - go to Profile'}
                        </div>
                    </div>

                    {/* Topic Selector */}
                    <div>
                        <label htmlFor="topic-select" className="text-sm font-medium text-muted-foreground mb-1 block">
                            Topic
                        </label>
                        <Select
                            id="topic-select"
                            options={topics.map(t => ({ value: t.value, label: t.label }))}
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            placeholder="Select a topic"
                        />
                    </div>

                    {/* Subtopic Selector */}
                    <div>
                        <label htmlFor="subtopic-select" className="text-sm font-medium text-muted-foreground mb-1 block">
                            Subtopic
                        </label>
                        <Select
                            id="subtopic-select"
                            options={subtopics.map(st => ({ value: st, label: st }))}
                            value={selectedSubtopic}
                            onChange={(e) => setSelectedSubtopic(e.target.value)}
                            disabled={!selectedTopic}
                            placeholder={selectedTopic ? "Select a subtopic" : "Select topic first"}
                        />
                    </div>

                    {/* Start Button */}
                    <Button
                        onClick={handleStart}
                        disabled={!canStart}
                        className="w-full"
                        size="lg"
                    >
                        Start Sprint
                    </Button>

                    {/* Info */}
                    <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
                        <p>• 45 seconds per question</p>
                        <p>• Automatic progression</p>
                        <p>• Earn 10-15 points per correct answer</p>
                        <p>• Exit anytime to see results</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
