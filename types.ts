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
  id: string; // From database
  timestamp: number; // created_at from database
  examProfile: string;
  topic: string;
  subTopic: string;
  isCorrect: boolean;
  timeTaken: number;
  targetTime: number;
  questionText: string;
}

// Updated to match Supabase User object
export type User = {
  id: string;
  app_metadata: {
    provider?: string;
    [key: string]: any;
  };
  user_metadata: {
    [key: string]: any;
  };
  aud: string;
  confirmation_sent_at?: string;
  recovery_sent_at?: string;
  email_change_sent_at?: string;
  new_email?: string;
  invited_at?: string;
  action_link?: string;
  email?: string;
  phone?: string;
  created_at: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  role?: string;
  updated_at?: string;
};