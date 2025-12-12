/**
 * EXAM TAXONOMY - Single Source of Truth
 * 
 * This file defines the EXACT topic/subtopic structure for all exams.
 * Both Admin Ingest and User Practice MUST use these exact values.
 * 
 * DO NOT use free-text for topics/subtopics anywhere else.
 */

export interface SubtopicDef {
    value: string;  // Database value (kebab-case)
    label: string;  // Display label
}

export interface TopicDef {
    value: string;  // Database value (kebab-case)
    label: string;  // Display label
    subtopics: SubtopicDef[];
}

export interface ExamDef {
    value: string;  // Database value (snake_case)
    label: string;  // Display label
    topics: TopicDef[];
}

export const EXAM_TAXONOMY: ExamDef[] = [
    {
        value: 'cat',
        label: 'CAT / MBA',
        topics: [
            {
                value: 'percentages-profit-loss',
                label: 'Percentages, Profit & Loss',
                subtopics: [
                    { value: 'basics-calculations', label: 'Basics & Calculations' },
                    { value: 'successive-percentage-change', label: 'Successive Percentage Change' },
                    { value: 'profit-loss-discount', label: 'Profit, Loss & Discount' },
                    { value: 'applications', label: 'Applications' },
                ],
            },
            {
                value: 'ratios-averages-mixtures',
                label: 'Ratios, Averages, Mixtures',
                subtopics: [
                    { value: 'ratio-proportion', label: 'Ratio & Proportion' },
                    { value: 'averages-weighted', label: 'Averages & Weighted Averages' },
                    { value: 'mixtures-alligations', label: 'Mixtures & Alligations' },
                    { value: 'partnership', label: 'Partnership' },
                ],
            },
            {
                value: 'time-speed-distance-work',
                label: 'Time, Speed, Distance & Work',
                subtopics: [
                    { value: 'time-work', label: 'Time & Work' },
                    { value: 'pipes-cisterns', label: 'Pipes & Cisterns' },
                    { value: 'tsd-basics', label: 'Time, Speed & Distance Basics' },
                    { value: 'relative-speed-boats', label: 'Relative Speed & Boats' },
                ],
            },
            {
                value: 'simple-compound-interest',
                label: 'Simple & Compound Interest',
                subtopics: [
                    { value: 'calculating-si-ci', label: 'Calculating SI & CI' },
                    { value: 'difference-si-ci', label: 'Difference between SI & CI' },
                    { value: 'installments', label: 'Installments' },
                    { value: 'growth-depreciation', label: 'Growth & Depreciation' },
                ],
            },
            {
                value: 'algebra',
                label: 'Algebra',
                subtopics: [
                    { value: 'linear-quadratic-equations', label: 'Linear & Quadratic Equations' },
                    { value: 'inequalities-modulus', label: 'Inequalities & Modulus' },
                    { value: 'logarithms-exponents', label: 'Logarithms & Exponents' },
                    { value: 'functions', label: 'Functions' },
                    { value: 'sequences-series', label: 'Sequences & Series' },
                ],
            },
            {
                value: 'number-systems',
                label: 'Number Systems',
                subtopics: [
                    { value: 'divisibility-remainders', label: 'Divisibility & Remainders' },
                    { value: 'factors-multiples-hcf-lcm', label: 'Factors & Multiples (HCF/LCM)' },
                    { value: 'unit-digits-base-system', label: 'Unit Digits & Base System' },
                    { value: 'cyclicity', label: 'Cyclicity' },
                ],
            },
            {
                value: 'geometry-mensuration',
                label: 'Geometry & Mensuration',
                subtopics: [
                    { value: 'lines-angles-triangles', label: 'Lines, Angles & Triangles' },
                    { value: 'circles-quadrilaterals', label: 'Circles & Quadrilaterals' },
                    { value: '2d-3d-mensuration', label: '2D & 3D Mensuration' },
                    { value: 'coordinate-geometry', label: 'Coordinate Geometry' },
                ],
            },
            {
                value: 'modern-math',
                label: 'Modern Math',
                subtopics: [
                    { value: 'permutations-combinations', label: 'Permutations & Combinations' },
                    { value: 'probability', label: 'Probability' },
                    { value: 'set-theory-venn-diagrams', label: 'Set Theory & Venn Diagrams' },
                ],
            },
        ],
    },
    {
        value: 'jee_main',
        label: 'JEE Main',
        topics: [
            {
                value: 'quadratic-equations',
                label: 'Quadratic Equations',
                subtopics: [
                    { value: 'nature-of-roots', label: 'Nature of Roots' },
                    { value: 'sum-product-of-roots', label: 'Sum and Product of Roots' },
                    { value: 'transformation-of-equations', label: 'Transformation of Equations' },
                    { value: 'location-of-roots', label: 'Location of Roots' },
                ],
            },
            {
                value: 'complex-numbers',
                label: 'Complex Numbers',
                subtopics: [
                    { value: 'algebra-of-complex-numbers', label: 'Algebra of Complex Numbers' },
                    { value: 'modulus-and-argument', label: 'Modulus and Argument' },
                    { value: 'de-moivres-theorem', label: "De Moivre's Theorem" },
                    { value: 'roots-of-unity', label: 'Roots of Unity' },
                ],
            },
            {
                value: 'sequences-and-series',
                label: 'Sequences & Series',
                subtopics: [
                    { value: 'arithmetic-progression', label: 'Arithmetic Progression (AP)' },
                    { value: 'geometric-progression', label: 'Geometric Progression (GP)' },
                    { value: 'harmonic-progression', label: 'Harmonic Progression (HP)' },
                    { value: 'sum-of-special-series', label: 'Sum of Special Series' },
                ],
            },
            {
                value: 'probability',
                label: 'Probability',
                subtopics: [
                    { value: 'basic-probability', label: 'Basic Probability' },
                    { value: 'conditional-probability', label: 'Conditional Probability' },
                    { value: 'bayes-theorem', label: "Bayes' Theorem" },
                    { value: 'binomial-distribution', label: 'Binomial Distribution' },
                ],
            },
        ],
    },
    {
        value: 'eamcet',
        label: 'AP/TS EAMCET',
        topics: [
            {
                value: 'algebra',
                label: 'Algebra',
                subtopics: [
                    { value: 'functions', label: 'Functions' },
                    { value: 'matrices', label: 'Matrices' },
                    { value: 'complex-numbers', label: 'Complex Numbers' },
                    { value: 'quadratic-expressions', label: 'Quadratic Expressions' },
                ],
            },
            {
                value: 'trigonometry',
                label: 'Trigonometry',
                subtopics: [
                    { value: 'trigonometric-ratios', label: 'Trigonometric Ratios' },
                    { value: 'properties-of-triangles', label: 'Properties of Triangles' },
                    { value: 'inverse-trigonometric-functions', label: 'Inverse Trigonometric Functions' },
                    { value: 'hyperbolic-functions', label: 'Hyperbolic Functions' },
                ],
            },
            {
                value: 'vector-algebra',
                label: 'Vector Algebra',
                subtopics: [
                    { value: 'addition-of-vectors', label: 'Addition of Vectors' },
                    { value: 'scalar-dot-product', label: 'Scalar (Dot) Product' },
                    { value: 'vector-cross-product', label: 'Vector (Cross) Product' },
                    { value: 'scalar-triple-product', label: 'Scalar Triple Product' },
                ],
            },
            {
                value: 'probability',
                label: 'Probability',
                subtopics: [
                    { value: 'measures-of-dispersion', label: 'Measures of Dispersion' },
                    { value: 'basic-probability', label: 'Basic Probability' },
                    { value: 'random-variables', label: 'Random Variables' },
                    { value: 'probability-distributions', label: 'Probability Distributions' },
                ],
            },
        ],
    },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get exam definition by value
 */
export function getExam(examValue: string): ExamDef | undefined {
    return EXAM_TAXONOMY.find(e => e.value === examValue);
}

/**
 * Get topic definition by exam and topic value
 */
export function getTopic(examValue: string, topicValue: string): TopicDef | undefined {
    const exam = getExam(examValue);
    return exam?.topics.find(t => t.value === topicValue);
}

/**
 * Get subtopic definition
 */
export function getSubtopic(examValue: string, topicValue: string, subtopicValue: string): SubtopicDef | undefined {
    const topic = getTopic(examValue, topicValue);
    return topic?.subtopics.find(s => s.value === subtopicValue);
}

/**
 * Get all exams as options for select
 */
export function getExamOptions(): Array<{ value: string; label: string }> {
    return EXAM_TAXONOMY.map(e => ({ value: e.value, label: e.label }));
}

/**
 * Get topics for an exam as options for select
 */
export function getTopicOptions(examValue: string): Array<{ value: string; label: string }> {
    const exam = getExam(examValue);
    return exam?.topics.map(t => ({ value: t.value, label: t.label })) || [];
}

/**
 * Get subtopics for a topic as options for select
 */
export function getSubtopicOptions(examValue: string, topicValue: string): Array<{ value: string; label: string }> {
    const topic = getTopic(examValue, topicValue);
    return topic?.subtopics.map(s => ({ value: s.value, label: s.label })) || [];
}
