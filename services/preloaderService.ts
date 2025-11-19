
// SWITCHED TO GEMINI SERVICE
import { generateQuestionAndSolutions } from './geminiService';
import { QuestionData } from '../types';
import { EXAM_SPECIFIC_TOPICS } from '../constants';
import { log } from '../lib/log';

interface PreloadedData {
  key: string;
  data: QuestionData;
}

let preloadedQuestion: PreloadedData | null = null;

const getKey = (profile: string, topic: string, subTopic: string): string => `${profile}-${topic}-${subTopic}-0`;

export const preloadFirstQuestion = async (): Promise<void> => {
  try {
    const savedProfile = localStorage.getItem('examProfile');
    const savedTopic = localStorage.getItem('topic');

    if (savedProfile && savedTopic) {
      const topicsForExam = EXAM_SPECIFIC_TOPICS[savedProfile] || [];
      const currentTopicObject = topicsForExam.find(t => t.value === savedTopic);
      const firstSubTopic = currentTopicObject?.subTopics?.[0];

      if (firstSubTopic) {
        const key = getKey(savedProfile, savedTopic, firstSubTopic);
        // Don't preload if it's already there
        if (preloadedQuestion?.key === key) return;

        const data = await generateQuestionAndSolutions(savedTopic, firstSubTopic, savedProfile);
        preloadedQuestion = { key, data };
      }
    }
  } catch (error) {
    log.error("Failed to preload question:", error);
    // Fail silently, this is a background optimization
  }
};

export const getPreloadedQuestion = (profile: string, topic: string, subTopic: string): QuestionData | null => {
  const key = getKey(profile, topic, subTopic);
  if (preloadedQuestion && preloadedQuestion.key === key) {
    const data = preloadedQuestion.data;
    preloadedQuestion = null; // Consume the preloaded question so it's only used once
    return data;
  }
  return null;
};
