import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { QuestionData } from '../types';
import { generateQuestionAndSolutions } from '../services/geminiService';
import { getPreloadedQuestion } from '../services/preloaderService';
import { savePerformanceRecord } from '../services/performanceService';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { QuestionCard } from './QuestionCard';
import { SolutionView } from './SolutionView';
import { EXAM_SPECIFIC_TOPICS, EXAM_PROFILES } from '../constants';
import { Select } from './ui/Select';
import { PracticeErrorBoundary } from './PracticeErrorBoundary';
import { log } from '../lib/log';

const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 5V2M12 22v-3"/><path d="M17 9a5 5 0 0 1-10 0"/><path d="M5 14a2.5 2.5 0 0 1 5 0"/><path d="M14 14a2.5 2.5 0 0 1 5 0"/><path d="M2 14h1.5"/><path d="M20.5 14H22"/><path d="M9 14h6"/><path d="M5 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M15 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>;

// A simple hash function to create a consistent ID from the question text.
// This is needed because the Gemini response doesn't include a unique ID.
const createQuestionId = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'qid_' + Math.abs(hash).toString(16);
};


export const Practice: React.FC<{}> = () => {
  const [examProfile, setExamProfile] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [currentSubTopics, setCurrentSubTopics] = useState<string[]>([]);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);
  
  const [questionCache, setQuestionCache] = useState<{ [key: string]: QuestionData[] }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const startTimeRef = useRef<number | null>(null);

  const currentTopicInfo = useMemo(() => {
    return { topic, subTopic: selectedSubTopic };
  }, [topic, selectedSubTopic]);


  useEffect(() => {
    // Load preferences from localStorage on component mount
    const savedProfile = localStorage.getItem('examProfile') || EXAM_PROFILES[0].value;
    setExamProfile(savedProfile);

    const topicsForExam = EXAM_SPECIFIC_TOPICS[savedProfile] || [];
    const savedTopic = localStorage.getItem('topic') || (topicsForExam.length > 0 ? topicsForExam[0].value : '');
    setTopic(savedTopic);

    const currentTopicObject = topicsForExam.find(t => t.value === savedTopic);
    const subs = currentTopicObject?.subTopics || [];
    setCurrentSubTopics(subs);
      
    if (subs.length > 0) {
        setSelectedSubTopic(subs[0]);
    }
  }, []);

  const startTimer = () => {
    stopTimer();
    const startTime = Date.now();
    startTimeRef.current = startTime;
    timerRef.current = window.setInterval(() => {
      setTimeTaken(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const loadQuestion = useCallback(async (index: number) => {
    setQuestionData(null);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeTaken(0);
    stopTimer();

    const { subTopic: currentSubTopic, topic: currentTopic } = currentTopicInfo;
    if (!currentSubTopic || !currentTopic || !examProfile) return;

    // Check for preloaded question first (for initial load)
    if (index === 0) {
      const preloaded = getPreloadedQuestion(examProfile, currentTopic, currentSubTopic);
      if (preloaded) {
        setQuestionData(preloaded);
        setQuestionCache(prev => ({ ...prev, [currentSubTopic]: [preloaded] }));
        startTimer();
        return;
      }
    }

    if (questionCache[currentSubTopic]?.[index]) {
      setQuestionData(questionCache[currentSubTopic][index]);
      startTimer();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateQuestionAndSolutions(currentTopic, currentSubTopic, examProfile);
      setQuestionCache(prevCache => {
        const newCache = { ...prevCache };
        if (!newCache[currentSubTopic]) newCache[currentSubTopic] = [];
        newCache[currentSubTopic][index] = data;
        return newCache;
      });
      setQuestionData(data);
      startTimer();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentTopicInfo, examProfile, questionCache]);

  useEffect(() => {
    if (currentTopicInfo.subTopic) {
      loadQuestion(currentQuestionIndex);
    }
  }, [currentTopicInfo, currentQuestionIndex, loadQuestion]);

  const handleSubTopicSelect = (subTopic: string) => {
    if (subTopic === selectedSubTopic) return;
    setSelectedSubTopic(subTopic);
    setCurrentQuestionIndex(0);
  };
  
  const targetTime = useMemo(() => {
    if (!questionData || !examProfile) return 0;
    switch (examProfile) {
      case 'jee_main': return questionData.timeTargets.jee_main;
      case 'cat': return questionData.timeTargets.cat;
      case 'eamcet': return questionData.timeTargets.eamcet;
      default: return 0;
    }
  }, [questionData, examProfile]);
  
  const handleOptionChange = (index: number) => {
    setSelectedOption(index);
  };

  const handleAnswerSubmit = async () => {
    if (selectedOption === null || !questionData) return;
    stopTimer();
    setIsAnswered(true);

    // The `firstActionMs` metric has been removed from the backend schema for simplification.
    // We no longer need to calculate or send it.

    try {
        await savePerformanceRecord({
            questionId: createQuestionId(questionData.questionText),
            isCorrect: selectedOption === questionData.correctOptionIndex,
            timeMs: timeTaken * 1000, // Service expects milliseconds
        });
    } catch (error) {
        // Error is already logged in the service
        alert("Could not save your progress. Please check the console for details.");
    }
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  if (!examProfile || !topic) {
    return (
        <Card>
            <CardContent className="p-6 text-center">
                <h3 className="text-lg font-medium">Set Your Preferences</h3>
                <p className="text-muted-foreground mt-2">
                    Please go to the 'Dashboard' to select your exam profile and topic before you start practicing.
                </p>
            </CardContent>
        </Card>
    );
  }

  const QuestionArea = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-card border rounded-xl h-full min-h-[300px]">
            <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-semibold">Generating Question...</p>
            <p className="text-sm text-muted-foreground">This may take a few seconds.</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      );
    }
    if (questionData) {
      return (
        <div className="space-y-8">
          <QuestionCard 
              data={questionData} 
              isAnswered={isAnswered}
              selectedOption={selectedOption}
              onOptionChange={handleOptionChange}
              onAnswerSubmit={handleAnswerSubmit}
              timeTaken={timeTaken}
              targetTime={targetTime}
          />
          {isAnswered && <SolutionView data={questionData} />}
        </div>
      );
    }
    return <div className="min-h-[300px]" />; // Placeholder for initial state
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="w-full lg:w-1/4 xl:w-1/5">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <h3 className="text-lg font-semibold mb-4 text-primary">Sub-topics</h3>
                <div className="flex flex-col space-y-2">
                {currentSubTopics.map((sub) => (
                    <button
                    key={sub}
                    onClick={() => handleSubTopicSelect(sub)}
                    className={`px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
                        selectedSubTopic === sub
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground'
                    }`}
                    >
                    {sub}
                    </button>
                ))}
                </div>
            </div>
            {/* Mobile Dropdown */}
            <div className="lg:hidden">
                <label htmlFor="subtopic-select" className="text-sm font-medium text-muted-foreground mb-1 block">Sub-topic</label>
                <Select
                    id="subtopic-select"
                    options={currentSubTopics.map(sub => ({ value: sub, label: sub }))}
                    value={selectedSubTopic || ''}
                    onChange={(e) => handleSubTopicSelect(e.target.value)}
                />
            </div>
        </aside>
      <main className={`flex-1 space-y-6`}>
        <PracticeErrorBoundary>
            <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground font-medium self-start sm:self-center">
                    Question {currentQuestionIndex + 1}
                </p>
                <div className="flex space-x-2 w-full sm:w-auto">
                <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0 || isLoading} className="flex-1 sm:flex-auto">
                    Previous
                </Button>
                <Button onClick={handleNextQuestion} disabled={isLoading} className="flex-1 sm:flex-auto">
                    Next Question
                </Button>
                </div>
            </CardContent>
            </Card>
            <QuestionArea />
        </PracticeErrorBoundary>
      </main>
    </div>
  );
};