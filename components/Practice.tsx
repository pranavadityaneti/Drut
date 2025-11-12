import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { QuestionData } from '../types';
import { generateQuestionAndSolutions } from '../services/geminiService';
import { getPreloadedQuestion } from '../services/preloaderService';
import { savePerformanceRecord } from '../services/performanceService';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { QuestionCard } from './QuestionCard';
import { SolutionView } from './SolutionView';
import { EXAM_SPECIFIC_TOPICS } from '../constants';
import { Select } from './ui/Select';
import { PersonalizedTopic } from '../App';

interface PracticeProps {
    personalizedTopics: PersonalizedTopic[] | null;
    onEndPersonalizedSession: () => void;
}

const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 5V2M12 22v-3"/><path d="M17 9a5 5 0 0 1-10 0"/><path d="M5 14a2.5 2.5 0 0 1 5 0"/><path d="M14 14a2.5 2.5 0 0 1 5 0"/><path d="M2 14h1.5"/><path d="M20.5 14H22"/><path d="M9 14h6"/><path d="M5 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M15 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>;


export const Practice: React.FC<PracticeProps> = ({ personalizedTopics, onEndPersonalizedSession }) => {
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
  const prefetchState = useRef<{ [key: string]: boolean }>({});

  const [isPersonalizedSession, setIsPersonalizedSession] = useState(false);

  useEffect(() => {
    setIsPersonalizedSession(!!personalizedTopics && personalizedTopics.length > 0);
    // When session mode changes, reset question state
    setCurrentQuestionIndex(0);
    setQuestionCache({});
  }, [personalizedTopics]);

  const currentTopicInfo = useMemo(() => {
    if (isPersonalizedSession && personalizedTopics) {
      return personalizedTopics[currentQuestionIndex % personalizedTopics.length];
    }
    return { topic, subTopic: selectedSubTopic };
  }, [isPersonalizedSession, personalizedTopics, currentQuestionIndex, topic, selectedSubTopic]);


  useEffect(() => {
    const savedProfile = localStorage.getItem('examProfile');
    const savedTopic = localStorage.getItem('topic');
    setExamProfile(savedProfile);
    setTopic(savedTopic);

    if (savedProfile && savedTopic) {
      const topicsForExam = EXAM_SPECIFIC_TOPICS[savedProfile] || [];
      const currentTopicObject = topicsForExam.find(t => t.value === savedTopic);
      const subs = currentTopicObject?.subTopics || [];
      setCurrentSubTopics(subs);
      
      if (subs.length > 0 && !isPersonalizedSession) {
        setSelectedSubTopic(subs[0]);
      }
    }
  }, [isPersonalizedSession]);

  const startTimer = () => {
    stopTimer();
    const startTime = Date.now();
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

  const prefetchNextQuestion = useCallback(async () => {
    const { topic: currentTopic, subTopic: currentSubTopic } = currentTopicInfo;
    if (!currentSubTopic || !currentTopic || !examProfile || isPersonalizedSession) return;

    const nextIndex = currentQuestionIndex + 1;
    const cacheKey = `${currentSubTopic}-${nextIndex}`;
    
    const isAlreadyCached = questionCache[currentSubTopic]?.[nextIndex];
    const isBeingPrefetched = prefetchState.current[cacheKey];

    if (isAlreadyCached || isBeingPrefetched) return;

    try {
      prefetchState.current[cacheKey] = true;
      const data = await generateQuestionAndSolutions(currentTopic, currentSubTopic, examProfile);
      setQuestionCache(prevCache => {
        const newCache = { ...prevCache };
        if (!newCache[currentSubTopic]) newCache[currentSubTopic] = [];
        newCache[currentSubTopic][nextIndex] = data;
        return newCache;
      });
    } catch (error) {
      console.error(`Failed to prefetch question for ${cacheKey}:`, error);
    } finally {
      delete prefetchState.current[cacheKey];
    }
  }, [currentQuestionIndex, currentTopicInfo, examProfile, questionCache, isPersonalizedSession]);
  
  const loadQuestion = useCallback(async (index: number) => {
    setQuestionData(null);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeTaken(0);
    stopTimer();

    const { topic: currentTopic, subTopic: currentSubTopic } = currentTopicInfo;
    if (!currentSubTopic || !currentTopic || !examProfile) return;

    if (index === 0 && !isPersonalizedSession) {
      const preloaded = getPreloadedQuestion(examProfile, currentTopic, currentSubTopic);
      if (preloaded) {
        setQuestionData(preloaded);
        setQuestionCache(prev => ({ ...prev, [currentSubTopic]: { ...(prev[currentSubTopic] || {}), 0: preloaded } }));
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
  }, [currentTopicInfo, examProfile, questionCache, isPersonalizedSession]);

  useEffect(() => {
    if (currentTopicInfo.subTopic) {
      loadQuestion(currentQuestionIndex);
    }
  }, [currentTopicInfo, currentQuestionIndex, loadQuestion]);

  useEffect(() => {
    if (questionData) {
      prefetchNextQuestion();
    }
  }, [questionData, prefetchNextQuestion]);

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

  const handleAnswerSubmit = () => {
    const { topic: currentTopic, subTopic: currentSubTopic } = currentTopicInfo;
    if (selectedOption === null || !questionData || !examProfile || !currentTopic || !currentSubTopic) return;
    stopTimer();
    setIsAnswered(true);

    savePerformanceRecord({
        questionText: questionData.questionText,
        examProfile: examProfile,
        topic: currentTopic,
        subTopic: currentSubTopic,
        isCorrect: selectedOption === questionData.correctOptionIndex,
        timeTaken,
        targetTime,
    });
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0 && !isPersonalizedSession) {
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
              onOptionChange={setSelectedOption}
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
      {!isPersonalizedSession && (
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
      )}
      <main className={`flex-1 space-y-6 ${isPersonalizedSession ? 'w-full' : ''}`}>
        {isPersonalizedSession && (
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="flex items-center">
                        <BrainCircuitIcon />
                        <h3 className="ml-3 font-semibold text-center sm:text-left">Personalized Practice Session</h3>
                    </div>
                    <Button onClick={onEndPersonalizedSession} className="bg-destructive/10 text-destructive hover:bg-destructive/20 w-full sm:w-auto">
                        End Session
                    </Button>
                </CardContent>
            </Card>
        )}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground font-medium self-start sm:self-center">
                Question {currentQuestionIndex + 1}
                {isPersonalizedSession && ` of ${personalizedTopics?.length}`}
            </p>
            <div className="flex space-x-2 w-full sm:w-auto">
              <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0 || isLoading || isPersonalizedSession} className="flex-1 sm:flex-auto">
                Previous
              </Button>
              <Button onClick={handleNextQuestion} disabled={isLoading} className="flex-1 sm:flex-auto">
                Next Question
              </Button>
            </div>
          </CardContent>
        </Card>
        <QuestionArea />
      </main>
    </div>
  );
};
