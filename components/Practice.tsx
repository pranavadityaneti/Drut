import React, { useState, useCallback, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { generateQuestionAndSolutions } from '../services/geminiService';
import { getPreloadedQuestion } from '../services/preloaderService';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { QuestionCard } from './QuestionCard';
import { SolutionView } from './SolutionView';
import { EXAM_SPECIFIC_TOPICS } from '../constants';

const SubTopicSidebar: React.FC<{
  subTopics: string[];
  selectedSubTopic: string | null;
  onSelect: (subTopic: string) => void;
}> = ({ subTopics, selectedSubTopic, onSelect }) => (
  <aside className="w-full md:w-1/4 lg:w-1/5 border-r pr-4">
    <h3 className="text-lg font-semibold mb-3 text-primary">Sub-topics</h3>
    <div className="flex flex-col space-y-2">
      {subTopics.map((sub) => (
        <button
          key={sub}
          onClick={() => onSelect(sub)}
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
  </aside>
);

export const Practice: React.FC = () => {
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
      
      if (subs.length > 0) {
        setSelectedSubTopic(subs[0]);
      }
    }
  }, []);

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
    if (!selectedSubTopic || !topic || !examProfile) return;

    const nextIndex = currentQuestionIndex + 1;
    const cacheKey = `${selectedSubTopic}-${nextIndex}`;
    
    const isAlreadyCached = questionCache[selectedSubTopic]?.[nextIndex];
    const isBeingPrefetched = prefetchState.current[cacheKey];

    if (isAlreadyCached || isBeingPrefetched) return;

    try {
      prefetchState.current[cacheKey] = true;
      const data = await generateQuestionAndSolutions(topic, selectedSubTopic, examProfile);
      setQuestionCache(prevCache => {
        const newCache = { ...prevCache };
        if (!newCache[selectedSubTopic]) newCache[selectedSubTopic] = [];
        newCache[selectedSubTopic][nextIndex] = data;
        return newCache;
      });
    } catch (error) {
      console.error(`Failed to prefetch question for ${cacheKey}:`, error);
    } finally {
      delete prefetchState.current[cacheKey];
    }
  }, [currentQuestionIndex, selectedSubTopic, topic, examProfile, questionCache]);
  
  const loadQuestion = useCallback(async (index: number) => {
    setQuestionData(null);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeTaken(0);
    stopTimer();

    if (!selectedSubTopic || !topic || !examProfile) return;

    if (index === 0) {
      const preloaded = getPreloadedQuestion(examProfile, topic, selectedSubTopic);
      if (preloaded) {
        setQuestionData(preloaded);
        setQuestionCache(prev => ({ ...prev, [selectedSubTopic]: { ...(prev[selectedSubTopic] || {}), 0: preloaded } }));
        startTimer();
        return;
      }
    }

    if (questionCache[selectedSubTopic]?.[index]) {
      setQuestionData(questionCache[selectedSubTopic][index]);
      startTimer();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await generateQuestionAndSolutions(topic, selectedSubTopic, examProfile);
      setQuestionCache(prevCache => {
        const newCache = { ...prevCache };
        if (!newCache[selectedSubTopic]) newCache[selectedSubTopic] = [];
        newCache[selectedSubTopic][index] = data;
        return newCache;
      });
      setQuestionData(data);
      startTimer();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubTopic, topic, examProfile, questionCache]);

  useEffect(() => {
    if (selectedSubTopic) {
      loadQuestion(currentQuestionIndex);
    }
  }, [selectedSubTopic, currentQuestionIndex, loadQuestion]);

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

  const handleAnswerSubmit = () => {
    if (selectedOption === null) return;
    stopTimer();
    setIsAnswered(true);
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
              examProfile={examProfile}
              isAnswered={isAnswered}
              selectedOption={selectedOption}
              onOptionChange={setSelectedOption}
              onAnswerSubmit={handleAnswerSubmit}
              timeTaken={timeTaken}
          />
          {isAnswered && <SolutionView data={questionData} />}
        </div>
      );
    }
    return <div className="min-h-[300px]" />; // Placeholder for initial state
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <SubTopicSidebar 
        subTopics={currentSubTopics} 
        selectedSubTopic={selectedSubTopic} 
        onSelect={handleSubTopicSelect} 
      />
      <main className="flex-1 space-y-4">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1}
            </p>
            <div className="flex space-x-2">
              <Button onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0 || isLoading}>
                Previous
              </Button>
              <Button onClick={handleNextQuestion} disabled={isLoading}>
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