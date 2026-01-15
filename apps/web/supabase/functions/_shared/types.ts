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
    // T.A.R. Algorithm (Optimal Path)
    optimal_path: {
        available: boolean;
        steps: string[];
    } | null;
    // D.E.E.P. Framework (Full Solution)
    full_solution: {
        phases: Array<{
            label: 'DIAGNOSE' | 'EXTRACT' | 'EXECUTE' | 'PROOF';
            content: string;
        }>;
    };
    // Legacy mapping for backward compatibility (Optional)
    fastestSafeMethod?: any;
    fullStepByStep?: any;
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
    // RAG Filters
    classLevel?: string;
    board?: string;
    subject?: string;
}

export interface GenerateBatchRequest {
    topic: string;
    subtopic: string;
    examProfile: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    count: number;
    // RAG Filters
    classLevel?: string;
    board?: string;
    subject?: string;
}

export interface PerformanceData {
    totalAttempts: number;
    accuracy: number;
    avgTimeMs: number;
    weakestSubtopics: Array<{ subtopic: string; accuracy: number }>;
    distractors: Array<{ subtopic: string; wrong_answer_text: string; choice_count: number }>;
}
