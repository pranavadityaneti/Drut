import React, { useState } from 'react';
import { SprintSetup } from './sprint/SprintSetup';
import { SprintSession } from './sprint/SprintSession';
import { SprintResultsScreen } from './sprint/SprintResultsScreen';
import { QuestionData } from '@drut/shared';

type Screen = 'start' | 'session' | 'results';

interface SessionConfig {
    topic: string;
    subtopic: string;
    examProfile: string;
    questionCount: number;
    classLevel?: string;
    board?: string;
    subject?: string;
    retryQuestions?: QuestionData[];
}

export const Sprint: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('start');
    const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const handleStartSprint = (config: Omit<SessionConfig, 'retryQuestions'>) => {
        setSessionConfig(config);
        setScreen('session');
    };

    const handleExitSession = (completedSessionId: string) => {
        if (completedSessionId === 'error') {
            setScreen('start');
            return;
        }
        setSessionId(completedSessionId);
        setScreen('results');
    };

    const handleRetryMissed = (missedQuestions: QuestionData[]) => {
        if (!sessionConfig) return;

        setSessionConfig({
            ...sessionConfig,
            retryQuestions: missedQuestions,
        });
        setScreen('session');
    };

    const handleNewSprint = () => {
        setSessionConfig(null);
        setSessionId(null);
        setScreen('start');
    };

    const handleBackToPractice = (subtopic?: string) => {
        // If subtopic provided, navigate to practice with that subtopic pre-selected
        if (subtopic) {
            // Save subtopic to localStorage so Practice page can pick it up
            localStorage.setItem('selectedSubtopic', subtopic);
        }
        window.location.href = '/practice';
    };

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            {screen === 'start' && (
                <SprintSetup onStart={handleStartSprint} />
            )}

            {screen === 'session' && sessionConfig && (
                <SprintSession
                    config={sessionConfig}
                    onExit={handleExitSession}
                />
            )}

            {screen === 'results' && sessionId && (
                <SprintResultsScreen
                    sessionId={sessionId}
                    onRetry={handleRetryMissed}
                    onNewSprint={handleNewSprint}
                    onBackToPractice={handleBackToPractice}
                />
            )}
        </div>
    );
};
