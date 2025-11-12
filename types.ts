
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
