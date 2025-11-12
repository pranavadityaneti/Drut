
export interface TimeTargets {
  jee_main: number;
  cat: number;
  eamcet: number;
}

export interface FastestSafeMethod {
  exists: boolean;
  preconditions: string;
  steps: string[];
  sanityCheck: string;
}

export interface FullStepByStep {
  steps: string[];
}

export interface QuestionOption {
    text: string;
}

export interface QuestionData {
  questionText: string;
  options: QuestionOption[];
  correctOptionIndex: number;
  timeTargets: TimeTargets;
  fastestSafeMethod: FastestSafeMethod;
  fullStepByStep: FullStepByStep;
}

export interface PerformanceRecord {
  id: string; // Unique ID, e.g., hash of questionText + timestamp
  timestamp: number;
  examProfile: string;
  topic: string;
  subTopic: string;
  isCorrect: boolean;
  timeTaken: number;
  targetTime: number;
  questionText: string;
}

export interface User {
  email: string;
}
