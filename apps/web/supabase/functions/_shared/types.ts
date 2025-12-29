// Shared types for Edge Functions
export interface QuestionItem {
    questionText: string;
    options: Array<{ text: string }>;
    correctOptionIndex: number;
    timeTargets: {
        jee_main: number;
        cat: number;
        eamcet: number;
    };
    fastestSafeMethod: {
        exists: boolean;
        preconditions?: string;
        steps: string[];
        sanityCheck?: string;
    };
    fullStepByStep: {
        steps: string[];
    };
    // NEW: Visual description for diagram generation (prompt for image model)
    visualDescription?: string | null;
    // NEW: Hosted diagram URL (replaces diagramCode)
    diagramUrl?: string | null;
    // NEW: Whether this question requires a diagram
    diagramRequired?: boolean;
}

export interface DiagramRequest {
    questionId: string;
    visualDescription: string;
}

export interface GenerateQuestionRequest {
    topic: string;
    subtopic: string;
    examProfile: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface GenerateBatchRequest {
    topic: string;
    subtopic: string;
    examProfile: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    count: number;
}

export interface PerformanceData {
    totalAttempts: number;
    accuracy: number;
    avgTimeMs: number;
    weakestSubtopics: Array<{ subtopic: string; accuracy: number }>;
    distractors: Array<{ subtopic: string; wrong_answer_text: string; choice_count: number }>;
}
