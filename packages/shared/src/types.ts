


export interface TimeTargets {
  jee_main: number;
  cat: number;
  eamcet: number;
  mht_cet?: number;
  wbjee?: number;
  kcet?: number;
  gujcet?: number;
  keam?: number;
  jee_advanced?: number;
}

export interface TheOptimalPath {
  exists: boolean;
  preconditions?: string;
  steps: string[];
  sanityCheck?: string;
}

export interface FullStepByStep {
  steps: string[];
}

export interface QuestionOption {
  text: string;
}

export interface QuestionData {
  // Supabase UUID from cached_questions table
  uuid: string;
  questionText: string;
  options: QuestionOption[];
  correctOptionIndex: number;
  timeTargets: TimeTargets;
  theOptimalPath: TheOptimalPath;
  fullStepByStep: FullStepByStep;
  // Pattern tag for grouping
  fsmTag: string;
  // Learning explanation
  fsm_explanation?: string;
  // Visual description - prompt for image model
  visualDescription?: string;
  // Hosted diagram URL from Supabase Storage
  diagramUrl?: string;
  // Whether this question requires a diagram
  diagramRequired?: boolean;
  // Question difficulty for dynamic timer
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

// This is the data shape returned by our server-side analytics RPC.
// It is also defined in `services/analyticsService.ts`
export type AnalyticsRow = {
  total_attempts: number;
  correct_attempts: number;
  accuracy_pct: number;
  avg_time_ms: number;
};

export interface UserMetadata {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  exam_profile?: string;
  class?: '11' | '12' | 'Reappear';
  target_exams?: string[];
  onboarding_completed?: boolean;
  [key: string]: any;
}


// Updated to match Supabase User object
export type User = {
  id: string;
  app_metadata: {
    provider?: string;
    [key: string]: any;
  };
  user_metadata: UserMetadata;
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