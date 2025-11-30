
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { QuestionData } from '../types';
// Using smart caching service (prevents question repetition per user)
import { getQuestionsForUser, getUnseenQuestionCount } from '../services/questionCacheService';
import { getCurrentUser } from '../services/authService';
import { getPreloadedQuestion } from '../services/preloaderService';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { QuestionCard } from './QuestionCard';
import { SolutionView } from './SolutionView';
import { EXAM_SPECIFIC_TOPICS, EXAM_PROFILES } from '../constants';
import { Select } from './ui/Select';
import { PracticeErrorBoundary } from './PracticeErrorBoundary';
import { log } from '../lib/log';
import { usePrefetchExplanations } from '../hooks/usePrefetchExplanations';
import { Explanation, upsertExplanationCache } from '../lib/explCache';
import { savePerformance } from '../services/performanceService';
import { createQuestionId } from '../lib/questionUtils';
import { useModal } from './ui/Modal';
import { classifySupabaseError, SupaKind } from '../lib/supabaseError';


const DatabaseSetupModalBody: React.FC<{ errorKind: SupaKind }> = ({ errorKind }) => {
  const openReadme = () => {
    window.open('about:blank#readme-db-setup', '_blank');
  };

  const errorDetails = {
    MISSING_RPC: 'The required database function `log_performance_v1` was not found.',
    MISSING_TABLE: 'The required database table `performance_records` was not found.'
  };

  const message = errorDetails[errorKind as keyof typeof errorDetails] || 'A required database component is missing.';

  return (
    <div className="space-y-4 text-sm">
      <p className="text-destructive font-semibold">
        Error: {message}
      </p>
      <p>
        This is a common setup issue. Please follow these steps in your Supabase project:
      </p>
      <ol className="list-decimal list-inside space-y-2 bg-muted p-4 rounded-md">
        <li>Go to the <strong>SQL Editor</strong>.</li>
        <li>Copy the entire SQL script from the <strong>`README.md`</strong> file.</li>
        <li>Paste the script and click <strong>RUN</strong>.</li>
        <li>
          <strong>(Crucial):</strong> Go to <strong>API</strong> settings and <strong>Reload</strong> the schema cache.
        </li>
      </ol>
      <p>
        After completing these steps, the performance tracking will work correctly.
      </p>
      <Button onClick={openReadme} variant="outline" className="w-full">
        Open README with Full SQL Script
      </Button>
    </div>
  );
};

// Helper to convert structured question data into the Markdown format expected by SolutionView
const formatExplanation = (q: QuestionData): Explanation => {
  // Format Fastest Safe Method
  const steps = q.fastestSafeMethod.steps.map(s => `- ${s}`).join('\n');
  const preconditions = q.fastestSafeMethod.preconditions
    ? `**Preconditions:** ${q.fastestSafeMethod.preconditions}\n\n`
    : '';
  const sanity = q.fastestSafeMethod.sanityCheck
    ? `\n\n**Sanity Check:** ${q.fastestSafeMethod.sanityCheck}`
    : '';

  const fastMd = `${preconditions}**Steps:**\n${steps}${sanity}`;

  // Format Full Solution
  const fullMd = q.fullStepByStep.steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n');

  return {
    fast_md: fastMd,
    full_md: fullMd,
    fast_safe: q.fastestSafeMethod.exists,
    risk_shortcut: 0
  };
};


export const Practice: React.FC<{}> = () => {
  const [examProfile, setExamProfile] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [currentSubTopics, setCurrentSubTopics] = useState<string[]>([]);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const [questionCache, setQuestionCache] = useState<{ [key: string]: QuestionData[] }>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { openModal } = useModal();

  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [explanationData, setExplanationData] = useState<Explanation | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const [timeTaken, setTimeTaken] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const fetchingRef = useRef<boolean>(false);
  const questionCacheRef = useRef<{ [key: string]: QuestionData[] }>({});

  const currentTopicInfo = useMemo(() => {
    return { topic, subTopic: selectedSubTopic };
  }, [topic, selectedSubTopic]);

  const currentQuestionWithId = useMemo(() => {
    if (!questionData) return null;
    return { ...questionData, id: createQuestionId(questionData.questionText) };
  }, [questionData]);

  const nextQuestionsWithId = useMemo(() => {
    const { subTopic } = currentTopicInfo;
    if (!subTopic || !questionCache[subTopic] || questionCache[subTopic].length <= currentQuestionIndex + 1) {
      return [];
    }
    return questionCache[subTopic]
      .slice(currentQuestionIndex + 1)
      .map(q => ({ ...q, id: createQuestionId(q.questionText) }));
  }, [questionCache, currentTopicInfo, currentQuestionIndex]);

  usePrefetchExplanations(currentQuestionWithId, nextQuestionsWithId);

  // Ensure we always have a buffer of questions
  const ensureQuestionBuffer = useCallback(async (startIndex: number) => {
    const { subTopic: currentSubTopic, topic: currentTopic } = currentTopicInfo;
    if (!currentSubTopic || !currentTopic || !examProfile || fetchingRef.current) return;

    // Use ref to avoid dependency on questionCache (prevents refresh loop)
    const currentCount = questionCacheRef.current[currentSubTopic]?.length || 0;
    const needed = (startIndex + 1) - currentCount; // Aim to have current + 1 more

    if (needed <= 0) return;

    fetchingRef.current = true;
    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        log.warn('[cache] No user found, cannot fetch questions');
        return;
      }

      // Fetch questions using smart cache (no repetition for this user)
      const batchSize = Math.max(needed, 1); // Fetch one at a time for faster response
      const { questions, metadata } = await getQuestionsForUser(
        user.id,
        examProfile,
        currentTopic,
        currentSubTopic,
        batchSize,
        difficulty
      );

      if (questions.length > 0) {
        log.info(`[cache] Loaded ${questions.length} questions (${metadata.cached} cached, ${metadata.generated} generated)`);

        setQuestionCache(prevCache => {
          const newCache = { ...prevCache };
          const existing = newCache[currentSubTopic] || [];
          newCache[currentSubTopic] = [...existing, ...(questions as QuestionData[])];
          // Update ref to keep it in sync
          questionCacheRef.current = newCache;
          return newCache;
        });
      }
    } catch (err: any) {
      log.error(`Buffer fetch failed:`, err.message);

      // Show user-friendly error for quota issues
      if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
        setError('⚠️ API quota limit reached. Showing questions from cache. New questions will be available soon.');
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [currentTopicInfo, examProfile, difficulty]);


  const loadQuestion = useCallback(async (index: number) => {
    setQuestionData(null);
    setExplanationData(null);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeTaken(0);
    stopTimer();

    const { subTopic: currentSubTopic, topic: currentTopic } = currentTopicInfo;
    if (!currentSubTopic || !currentTopic || !examProfile) return;

    // Trigger buffer check
    ensureQuestionBuffer(index);

    // 1. Check Preloader (only for index 0)
    if (index === 0) {
      const preloaded = getPreloadedQuestion(examProfile, currentTopic, currentSubTopic);
      if (preloaded) {
        setQuestionData(preloaded);
        setQuestionCache(prev => {
          const newCache = { ...prev, [currentSubTopic]: [preloaded] };
          // Update ref to keep it in sync
          questionCacheRef.current = newCache;
          return newCache;
        });
        startTimer();
        return;
      }
    }

    // 2. Check Cache
    if (questionCache[currentSubTopic]?.[index]) {
      setQuestionData(questionCache[currentSubTopic][index]);
      startTimer();
      return;
    }

    // 3. Fallback: Fetch Immediately if cache miss
    setIsLoading(true);
    setError(null);
    try {
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Please log in to practice');
      }

      // If we are here, the buffer wasn't ready. Fetch one immediately using smart cache.
      const { questions } = await getQuestionsForUser(
        user.id,
        examProfile,
        currentTopic,
        currentSubTopic,
        1, // Just one question needed
        difficulty
      );

      if (questions.length === 0) {
        throw new Error('No questions available. Please try again later.');
      }

      const data = questions[0];
      setQuestionData(data as QuestionData);
        setQuestionCache(prevCache => {
          const newCache = { ...prevCache };
          if (!newCache[currentSubTopic]) newCache[currentSubTopic] = [];
          newCache[currentSubTopic][index] = data as QuestionData;
          // Update ref to keep it in sync
          questionCacheRef.current = newCache;
          return newCache;
        });

      startTimer();
      // Refill buffer after immediate fetch
      ensureQuestionBuffer(index + 1);
    } catch (err: any) {
      // Better error handling for quota issues
      if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
        setError('⚠️ API quota limit reached. We\'re showing you questions from cache. New questions will be available soon.');
      } else {
        setError(err.message || 'An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentTopicInfo, questionCache, ensureQuestionBuffer, examProfile]);


  const loadProfileSettings = useCallback((profile: string | null) => {
    const profileToLoad = profile || EXAM_PROFILES[0].value;
    setExamProfile(profileToLoad);

    const topicsForExam = EXAM_SPECIFIC_TOPICS[profileToLoad] || [];
    const savedTopic = localStorage.getItem('topic');

    const isTopicValid = topicsForExam.some(t => t.value === savedTopic);
    const topicToLoad = isTopicValid ? savedTopic : (topicsForExam.length > 0 ? topicsForExam[0].value : '');

    setTopic(topicToLoad);

    const currentTopicObject = topicsForExam.find(t => t.value === topicToLoad);
    const subs = currentTopicObject?.subTopics || [];
    setCurrentSubTopics(subs);

    if (subs.length > 0) {
      setSelectedSubTopic(subs[0]);
    } else {
      setSelectedSubTopic(null);
    }
    setCurrentQuestionIndex(0);
  }, []);

  // Sync ref with state on mount and when cache changes
  useEffect(() => {
    questionCacheRef.current = questionCache;
  }, [questionCache]);

  useEffect(() => {
    const savedProfile = localStorage.getItem('examProfile');
    loadProfileSettings(savedProfile);
  }, [loadProfileSettings]);

  useEffect(() => {
    const handleSettingsChange = () => {
      const savedProfile = localStorage.getItem('examProfile');
      if (savedProfile && savedProfile !== examProfile) {
        loadProfileSettings(savedProfile);
      }
    };
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, [examProfile, loadProfileSettings]);

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

  useEffect(() => {
    if (currentTopicInfo.subTopic) {
      loadQuestion(currentQuestionIndex);
    }
  }, [currentTopicInfo, currentQuestionIndex, loadQuestion]);

  const handleSubTopicSelect = (subTopic: string) => {
    if (subTopic === selectedSubTopic) return;
    setSelectedSubTopic(subTopic);
    setCurrentQuestionIndex(0);
    setQuestionCache({}); // Clear cache for new sub-topic
    questionCacheRef.current = {}; // Update ref
  };

  const handleDifficultyChange = (newDifficulty: 'Easy' | 'Medium' | 'Hard') => {
    if (newDifficulty === difficulty) return;
    setDifficulty(newDifficulty);
    setCurrentQuestionIndex(0);
    setQuestionCache({}); // Clear cache for new difficulty
    questionCacheRef.current = {}; // Update ref
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

  const handleAnswerSubmit = async () => {
    console.log('[DEBUG] Submit button clicked', { selectedOption, hasQuestionData: !!questionData, hasCurrentQuestionWithId: !!currentQuestionWithId });

    if (selectedOption === null || !questionData || !currentQuestionWithId) {
      console.log('[DEBUG] Submit blocked - missing data');
      return;
    }

    console.log('[DEBUG] Processing answer submission...');
    stopTimer();
    setIsAnswered(true);

    // 1. Show solution immediately (we already have the data)
    const explanation = formatExplanation(questionData);
    setExplanationData(explanation);

    // Cache for potential future revisits
    upsertExplanationCache(currentQuestionWithId.id, explanation);

    // 2. Save performance in background
    try {
      await savePerformance(
        selectedOption === questionData.correctOptionIndex,
        currentQuestionWithId.id,
        timeTaken * 1000
      );
    } catch (error: any) {
      log.error('Save performance error:', JSON.stringify(error, null, 2));
      const errorKind = classifySupabaseError(error);

      switch (errorKind) {
        case 'MISSING_RPC':
        case 'MISSING_TABLE':
          openModal({
            title: "Database Setup Required",
            body: <DatabaseSetupModalBody errorKind={errorKind} />,
          });
          break;
        case 'RLS_BLOCK':
          alert("Could not save progress: Action blocked by security policy.");
          break;
        case 'AUTH':
          alert("Could not save progress: You are not authenticated. Please log in again.");
          break;
        default:
          // Non-critical error, just log it to console, don't block user.
          log.warn("Performance save failed (non-critical):", error.message);
          break;
      }
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
            Please go to your Profile to select an exam before you start practicing.
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
        <div className="p-6 bg-red-50 border border-red-200 text-red-800 rounded-lg text-center">
          <h4 className="font-bold text-lg mb-2">Generation Failed</h4>
          <p>{error}</p>
          <Button variant="outline" onClick={() => loadQuestion(currentQuestionIndex)} className="mt-4 bg-white">
            Retry
          </Button>
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
          {isAnswered && explanationData && <SolutionView question={questionData} explanation={explanationData} />}
        </div>
      );
    }
    return <div className="min-h-[300px]" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="w-full lg:w-1/4 xl:w-1/5">
        <div className="hidden lg:block">
          <h3 className="text-lg font-semibold mb-4 text-primary">Sub-topics</h3>
          <div className="flex flex-col space-y-2">
            {currentSubTopics.map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubTopicSelect(sub)}
                className={`px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${selectedSubTopic === sub
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-muted-foreground'
                  }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
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
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-sm text-muted-foreground font-medium">
                Question {currentQuestionIndex + 1}
              </p>

              {/* Difficulty Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="difficulty-select" className="text-sm font-medium text-muted-foreground">
                  Difficulty:
                </label>
                <Select
                  id="difficulty-select"
                  options={[
                    { value: 'Easy', label: 'Easy' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Hard', label: 'Hard' }
                  ]}
                  value={difficulty}
                  onChange={(e) => handleDifficultyChange(e.target.value as 'Easy' | 'Medium' | 'Hard')}
                  className="w-32"
                />
              </div>

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
