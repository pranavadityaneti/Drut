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
    class_level?: '11' | '12'; // '11' = Class 11, '12' = Class 12. If undefined, assumed visible to all? Or default to 11? Let's use 11 for basics.
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
                class_level: '11', // Basics
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
                class_level: '11',
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
                class_level: '11',
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
                class_level: '11',
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
                class_level: '11',
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
                class_level: '11',
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
                class_level: '11', // Often starts early
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
                class_level: '12', // Slightly advanced usually
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
                class_level: '11',
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
                class_level: '11',
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
                class_level: '11',
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
                class_level: '12',
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
        label: 'AP/TS EAMCET', // Assuming similar split
        topics: [
            {
                value: 'algebra',
                label: 'Algebra',
                class_level: '11',
                subtopics: [
                    { value: 'functions', label: 'Functions' },
                    { value: 'matrices', label: 'Matrices' }, // Often 12
                    { value: 'complex-numbers', label: 'Complex Numbers' },
                    { value: 'quadratic-expressions', label: 'Quadratic Expressions' },
                ],
            },
            {
                value: 'trigonometry',
                label: 'Trigonometry',
                class_level: '11',
                subtopics: [
                    { value: 'trigonometric-ratios', label: 'Trigonometric Ratios' },
                    { value: 'properties-of-triangles', label: 'Properties of Triangles' },
                    { value: 'inverse-trigonometric-functions', label: 'Inverse Trigonometric Functions' }, // 12
                    { value: 'hyperbolic-functions', label: 'Hyperbolic Functions' },
                ],
            },
            {
                value: 'vector-algebra',
                label: 'Vector Algebra',
                class_level: '12',
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
                class_level: '12',
                subtopics: [
                    { value: 'measures-of-dispersion', label: 'Measures of Dispersion' },
                    { value: 'basic-probability', label: 'Basic Probability' },
                    { value: 'random-variables', label: 'Random Variables' },
                    { value: 'probability-distributions', label: 'Probability Distributions' },
                ],
            },
        ],
    },
    {
        value: 'mht_cet',
        label: 'MHT CET',
        topics: [
            // === PHYSICS (Class 11 - 20%) ===
            {
                value: 'motion-in-a-plane',
                label: 'Motion in a Plane (Phy 11)',
                class_level: '11',
                subtopics: [
                    { value: 'projectile-motion', label: 'Projectile Motion' },
                    { value: 'uniform-circular-motion', label: 'Uniform Circular Motion' }
                ]
            },
            {
                value: 'laws-of-motion',
                label: 'Laws of Motion (Phy 11)',
                class_level: '11',
                subtopics: [
                    { value: 'friction', label: 'Friction' },
                    { value: 'dynamics-of-circular-motion', label: 'Dynamics of Circular Motion' }
                ]
            },
            {
                value: 'gravitation',
                label: 'Gravitation (Phy 11)',
                class_level: '11',
                subtopics: [
                    { value: 'universal-law', label: 'Universal Law & Acceleration' },
                    { value: 'keplers-laws', label: "Kepler's Laws" }
                ]
            },
            {
                value: 'electrostatics',
                label: 'Electrostatics (Phy 11/12)',
                class_level: '12',
                subtopics: [
                    { value: 'electric-charges-fields', label: 'Electric Charges & Fields (11)' },
                    { value: 'capacitance-potential', label: 'Capacitance & Potential (12)' }
                ]
            },

            // === MATHS (Class 11 - 20%) ===
            {
                value: 'trigonometry-ii',
                label: 'Trigonometry II (Math 11)',
                class_level: '11',
                subtopics: [
                    { value: 'compound-angles', label: 'Compound Angles' },
                    { value: 'factorization-formulae', label: 'Factorization Formulae' }
                ]
            },
            {
                value: 'straight-lines',
                label: 'Straight Lines (Math 11)',
                class_level: '11',
                subtopics: [
                    { value: 'slope-of-line', label: 'Slope of a Line' },
                    { value: 'equation-forms', label: 'Equation Forms' }
                ]
            },
            {
                value: 'circles',
                label: 'Circles (Math 11)',
                class_level: '11',
                subtopics: [
                    { value: 'standard-equations', label: 'Standard Equations' },
                    { value: 'tangents-normals', label: 'Tangents & Normals' }
                ]
            },
            {
                value: 'probability', // Overlaps with JEE
                label: 'Probability (Math 11)',
                class_level: '11',
                subtopics: [
                    { value: 'basic-probability', label: 'Basic Probability' },
                    { value: 'conditional-probability', label: 'Conditional Probability' }
                ]
            },

            // === MATHS (Class 12 - 80% - Examples) === 
            {
                value: 'integration',
                label: 'Integration (Math 12)',
                class_level: '12',
                subtopics: [
                    { value: 'indefinite-integration', label: 'Indefinite Integration' },
                    { value: 'definite-integration', label: 'Definite Integration' }
                ]
            },
            {
                value: 'differentiation',
                label: 'Differentiation (Math 12)',
                class_level: '12',
                subtopics: [
                    { value: 'chain-rule', label: 'Chain Rule' },
                    { value: 'application-of-derivatives', label: 'Application of Derivatives' }
                ]
            }
        ],
    },
    {
        value: 'wbjee',
        label: 'WBJEE',
        topics: [
            {
                value: 'calculus',
                label: 'Calculus',
                class_level: '12',
                subtopics: [
                    { value: 'definite-integral', label: 'Definite Integral' },
                    { value: 'differential-equations', label: 'Differential Equations' },
                ]
            },
            {
                value: 'coordinate-geometry',
                label: 'Coordinate Geometry',
                class_level: '11',
                subtopics: [
                    { value: 'conic-sections', label: 'Conic Sections' },
                    { value: 'straight-lines', label: 'Straight Lines' },
                ]
            }
        ],
    },
    {
        value: 'kcet',
        label: 'KCET',
        topics: [
            {
                value: 'matrices-determinants',
                label: 'Matrices & Determinants',
                class_level: '12',
                subtopics: [
                    { value: 'matrices', label: 'Matrices' },
                    { value: 'determinants', label: 'Determinants' },
                ]
            },
            {
                value: 'calculus',
                label: 'Calculus',
                class_level: '12',
                subtopics: [
                    { value: 'continuity-differentiability', label: 'Continuity & Differentiability' },
                    { value: 'integrals', label: 'Integrals' },
                ]
            }
        ],
    },
    {
        value: 'gujcet',
        label: 'GUJCET',
        topics: [
            {
                value: 'class-12-math',
                label: 'Class 12 Math',
                class_level: '12',
                subtopics: [
                    { value: 'relations-functions', label: 'Relations & Functions' },
                    { value: 'linear-programming', label: 'Linear Programming' },
                ]
            }
        ]
    },
    {
        value: 'jee_advanced',
        label: 'JEE Advanced',
        topics: [
            // Using JEE Main topics as base syllabus, but questions will be Multi-Concept in data
            {
                value: 'quadratic-equations',
                label: 'Quadratic Equations',
                class_level: '11',
                subtopics: [
                    { value: 'nature-of-roots', label: 'Nature of Roots' },
                    { value: 'sum-product-of-roots', label: 'Sum and Product of Roots' },
                ],
            },
            {
                value: 'complex-numbers',
                label: 'Complex Numbers',
                class_level: '11',
                subtopics: [
                    { value: 'algebra-of-complex-numbers', label: 'Algebra of Complex Numbers' },
                    { value: 'de-moivres-theorem', label: "De Moivre's Theorem" },
                ],
            },
        ]
    }
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
