


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

// ---- New "B+C mix" solution format (calibrated 2026-06; clean, label-free, replaces
// the user-facing T.A.R./D.E.E.P. fields above). New questions carry these instead. ----
export interface QuickMethod {
  // Exactly 3 clean steps; NO framework labels (no Trigger/Action/Result)
  steps: string[];
}

export interface FullSolutionStep {
  text: string;        // flowing prose for this chunk (inline $...$ math)
  display?: string;    // optional pivotal equation, rendered centered as $$...$$ (no $ delimiters)
}

export interface FullSolution {
  approach: string;            // concept-led opener (the governing principle + why this route)
  steps: FullSolutionStep[];   // detailed, variable-length, NO numbers/labels
  answer: string;              // final answer + option letter
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
  // New "B+C mix" solution format (additive; new questions use these instead of the two legacy fields above)
  quickMethod?: QuickMethod;
  fullSolution?: FullSolution;
  // Governing concepts (backend tagging / focus areas) and per-option rationale
  concepts?: string[];
  distractorRationale?: string[];
  // Inter 1st/2nd year (Class 11 / 12) — now explicit
  class_level?: string;
  // Trust stamps (set by the generation/ingestion pipeline; read by the trust gate)
  verification_status?: string;
  source_type?: string;
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