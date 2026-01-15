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
    subject: string; // e.g. 'Mathematics', 'Physics', 'Chemistry'
    class_level?: '11' | '12'; // '11' = Class 11, '12' = Class 12.
    subtopics: SubtopicDef[];
}

export interface ExamDef {
    value: string;  // Database value (snake_case)
    label: string;  // Display label
    topics: TopicDef[];
}

// Reusable Topic List for JEE Main, AP EAPCET, TS EAPCET
// EAMCET syllabus matches JEE Main (NCERT) ~95%
const JEE_MAIN_TOPICS: TopicDef[] = [
    // ==================== MATHEMATICS (Class 11) ====================
    {
        value: 'functions',
        subject: 'Mathematics',
        label: 'Functions',
        class_level: '11',
        subtopics: [{ value: 'functions-gen', label: 'General' }],
    },
    {
        value: 'mathematical-induction',
        subject: 'Mathematics',
        label: 'Mathematical Induction',
        class_level: '11',
        subtopics: [{ value: 'mathematical-induction-gen', label: 'General' }],
    },
    {
        value: 'matrices',
        subject: 'Mathematics',
        label: 'Matrices',
        class_level: '11',
        subtopics: [{ value: 'matrices-gen', label: 'General' }],
    },
    {
        value: 'addition-of-vectors',
        subject: 'Mathematics',
        label: 'Addition of Vectors',
        class_level: '11',
        subtopics: [{ value: 'addition-of-vectors-gen', label: 'General' }],
    },
    {
        value: 'product-of-vectors',
        subject: 'Mathematics',
        label: 'Product of Vectors',
        class_level: '11',
        subtopics: [{ value: 'product-of-vectors-gen', label: 'General' }],
    },
    {
        value: 'trigonometric-ratios',
        subject: 'Mathematics',
        label: 'Trigonometric Ratios up to Transformations',
        class_level: '11',
        subtopics: [{ value: 'trigonometric-ratios-gen', label: 'General' }],
    },
    {
        value: 'trigonometric-equations',
        subject: 'Mathematics',
        label: 'Trigonometric Equations',
        class_level: '11',
        subtopics: [{ value: 'trigonometric-equations-gen', label: 'General' }],
    },
    {
        value: 'inverse-trigonometric-functions',
        subject: 'Mathematics',
        label: 'Inverse Trigonometric Functions',
        class_level: '11',
        subtopics: [{ value: 'inverse-trigonometric-functions-gen', label: 'General' }],
    },
    {
        value: 'hyperbolic-functions',
        subject: 'Mathematics',
        label: 'Hyperbolic Functions',
        class_level: '11',
        subtopics: [{ value: 'hyperbolic-functions-gen', label: 'General' }],
    },
    {
        value: 'properties-of-triangles',
        subject: 'Mathematics',
        label: 'Properties of Triangles',
        class_level: '11',
        subtopics: [{ value: 'properties-of-triangles-gen', label: 'General' }],
    },
    {
        value: 'locus',
        subject: 'Mathematics',
        label: 'Locus',
        class_level: '11',
        subtopics: [{ value: 'locus-gen', label: 'General' }],
    },
    {
        value: 'transformation-of-axes',
        subject: 'Mathematics',
        label: 'Transformation of Axes',
        class_level: '11',
        subtopics: [{ value: 'transformation-of-axes-gen', label: 'General' }],
    },
    {
        value: 'straight-line',
        subject: 'Mathematics',
        label: 'Straight Line',
        class_level: '11',
        subtopics: [{ value: 'straight-line-gen', label: 'General' }],
    },
    {
        value: 'pair-of-straight-lines',
        subject: 'Mathematics',
        label: 'Pair of Straight Lines',
        class_level: '11',
        subtopics: [{ value: 'pair-of-straight-lines-gen', label: 'General' }],
    },
    {
        value: 'three-dimensional-coordinates',
        subject: 'Mathematics',
        label: 'Three Dimensional Coordinates',
        class_level: '11',
        subtopics: [{ value: 'three-dimensional-coordinates-gen', label: 'General' }],
    },
    {
        value: 'direction-cosines-ratios',
        subject: 'Mathematics',
        label: 'Direction Cosines & Direction Ratios',
        class_level: '11',
        subtopics: [{ value: 'direction-cosines-ratios-gen', label: 'General' }],
    },
    {
        value: 'the-plane',
        subject: 'Mathematics',
        label: 'The Plane',
        class_level: '11',
        subtopics: [{ value: 'the-plane-gen', label: 'General' }],
    },



    // ==================== MATHEMATICS (Class 12) ====================
    {
        value: 'circle',
        subject: 'Mathematics',
        label: 'Circle',
        class_level: '12',
        subtopics: [{ value: 'circle-gen', label: 'General' }],
    },
    {
        value: 'system-of-circles',
        subject: 'Mathematics',
        label: 'System of Circles',
        class_level: '12',
        subtopics: [{ value: 'system-of-circles-gen', label: 'General' }],
    },
    {
        value: 'parabola',
        subject: 'Mathematics',
        label: 'Parabola',
        class_level: '12',
        subtopics: [{ value: 'parabola-gen', label: 'General' }],
    },
    {
        value: 'ellipse',
        subject: 'Mathematics',
        label: 'Ellipse',
        class_level: '12',
        subtopics: [{ value: 'ellipse-gen', label: 'General' }],
    },
    {
        value: 'hyperbola',
        subject: 'Mathematics',
        label: 'Hyperbola',
        class_level: '12',
        subtopics: [{ value: 'hyperbola-gen', label: 'General' }],
    },
    {
        value: 'indefinite-integration',
        subject: 'Mathematics',
        label: 'Indefinite Integration',
        class_level: '12',
        subtopics: [{ value: 'indefinite-integration-gen', label: 'General' }],
    },
    {
        value: 'definite-integrals',
        subject: 'Mathematics',
        label: 'Definite Integrals',
        class_level: '12',
        subtopics: [{ value: 'definite-integrals-gen', label: 'General' }],
    },
    {
        value: 'differential-equations',
        subject: 'Mathematics',
        label: 'Differential Equations',
        class_level: '12',
        subtopics: [{ value: 'differential-equations-gen', label: 'General' }],
    },
    {
        value: 'complex-numbers',
        subject: 'Mathematics',
        label: 'Complex Numbers',
        class_level: '12',
        subtopics: [{ value: 'complex-numbers-gen', label: 'General' }],
    },
    {
        value: 'de-moivres-theorem',
        subject: 'Mathematics',
        label: 'De Moivre’s Theorem',
        class_level: '12',
        subtopics: [{ value: 'de-moivres-theorem-gen', label: 'General' }],
    },
    {
        value: 'quadratic-expressions',
        subject: 'Mathematics',
        label: 'Quadratic Expressions',
        class_level: '12',
        subtopics: [{ value: 'quadratic-expressions-gen', label: 'General' }],
    },
    {
        value: 'theory-of-equations',
        subject: 'Mathematics',
        label: 'Theory of Equations',
        class_level: '12',
        subtopics: [{ value: 'theory-of-equations-gen', label: 'General' }],
    },
    {
        value: 'permutations-and-combinations',
        subject: 'Mathematics',
        label: 'Permutations and Combinations',
        class_level: '12',
        subtopics: [{ value: 'permutations-and-combinations-gen', label: 'General' }],
    },
    {
        value: 'binomial-theorem',
        subject: 'Mathematics',
        label: 'Binomial Theorem',
        class_level: '12',
        subtopics: [{ value: 'binomial-theorem-gen', label: 'General' }],
    },
    {
        value: 'partial-fractions',
        subject: 'Mathematics',
        label: 'Partial Fractions',
        class_level: '12',
        subtopics: [{ value: 'partial-fractions-gen', label: 'General' }],
    },
    {
        value: 'measures-of-dispersion',
        subject: 'Mathematics',
        label: 'Measures of Dispersion',
        class_level: '12',
        subtopics: [{ value: 'measures-of-dispersion-gen', label: 'General' }],
    },
    {
        value: 'probability',
        subject: 'Mathematics',
        label: 'Probability',
        class_level: '12',
        subtopics: [{ value: 'probability-gen', label: 'General' }],
    },
    {
        value: 'random-variables-distribution',
        subject: 'Mathematics',
        label: 'Random Variables and Probability Distributions',
        class_level: '12',
        subtopics: [{ value: 'random-variables-gen', label: 'General' }],
    },
    {
        value: 'exponential-logarithmic-series',
        subject: 'Mathematics',
        label: 'Exponential and Logarithmic Series',
        class_level: '12',
        subtopics: [{ value: 'series-gen', label: 'General' }],
    },
    {
        value: 'linear-programming',
        subject: 'Mathematics',
        label: 'Linear Programming',
        class_level: '12',
        subtopics: [{ value: 'linear-programming-gen', label: 'General' }],
    },


    // ==================== PHYSICS (Class 11) ====================
    {
        value: 'physical-world',
        subject: 'Physics',
        label: 'Physical World',
        class_level: '11',
        subtopics: [{ value: 'physical-world-gen', label: 'General' }],
    },
    {
        value: 'units-and-measurements',
        subject: 'Physics',
        label: 'Units and Measurements',
        class_level: '11',
        subtopics: [{ value: 'units-and-measurements-gen', label: 'General' }],
    },
    {
        value: 'motion-in-a-straight-line',
        subject: 'Physics',
        label: 'Motion in a Straight Line',
        class_level: '11',
        subtopics: [{ value: 'motion-in-a-straight-line-gen', label: 'General' }],
    },
    {
        value: 'motion-in-a-plane',
        subject: 'Physics',
        label: 'Motion in a Plane',
        class_level: '11',
        subtopics: [{ value: 'motion-in-a-plane-gen', label: 'General' }],
    },
    {
        value: 'laws-of-motion',
        subject: 'Physics',
        label: 'Laws of Motion',
        class_level: '11',
        subtopics: [{ value: 'laws-of-motion-gen', label: 'General' }],
    },
    {
        value: 'work-energy-and-power',
        subject: 'Physics',
        label: 'Work, Energy and Power',
        class_level: '11',
        subtopics: [{ value: 'work-energy-and-power-gen', label: 'General' }],
    },
    {
        value: 'system-of-particles-rotational-motion',
        subject: 'Physics',
        label: 'System of Particles & Rotational Motion',
        class_level: '11',
        subtopics: [{ value: 'system-of-particles-gen', label: 'General' }],
    },
    {
        value: 'oscillations',
        subject: 'Physics',
        label: 'Oscillations',
        class_level: '11',
        subtopics: [{ value: 'oscillations-gen', label: 'General' }],
    },
    {
        value: 'gravitation',
        subject: 'Physics',
        label: 'Gravitation',
        class_level: '11',
        subtopics: [{ value: 'gravitation-gen', label: 'General' }],
    },
    {
        value: 'mechanical-properties-of-solids',
        subject: 'Physics',
        label: 'Mechanical Properties of Solids',
        class_level: '11',
        subtopics: [{ value: 'solids-gen', label: 'General' }],
    },
    {
        value: 'mechanical-properties-of-fluids',
        subject: 'Physics',
        label: 'Mechanical Properties of Fluids',
        class_level: '11',
        subtopics: [{ value: 'fluids-gen', label: 'General' }],
    },
    {
        value: 'thermal-properties-of-matter',
        subject: 'Physics',
        label: 'Thermal Properties of Matter',
        class_level: '11',
        subtopics: [{ value: 'thermal-properties-gen', label: 'General' }],
    },
    {
        value: 'thermodynamics',
        subject: 'Physics',
        label: 'Thermodynamics',
        class_level: '11',
        subtopics: [{ value: 'thermodynamics-gen', label: 'General' }],
    },
    {
        value: 'kinetic-theory',
        subject: 'Physics',
        label: 'Kinetic Theory',
        class_level: '11',
        subtopics: [{ value: 'kinetic-theory-gen', label: 'General' }],
    },

    // ==================== PHYSICS (Class 12) ====================
    {
        value: 'waves',
        subject: 'Physics',
        label: 'Waves',
        class_level: '12',
        subtopics: [{ value: 'waves-gen', label: 'General' }],
    },
    {
        value: 'ray-optics-optical-instruments',
        subject: 'Physics',
        label: 'Ray Optics and Optical Instruments',
        class_level: '12',
        subtopics: [{ value: 'ray-optics-gen', label: 'General' }],
    },
    {
        value: 'wave-optics',
        subject: 'Physics',
        label: 'Wave Optics',
        class_level: '12',
        subtopics: [{ value: 'wave-optics-gen', label: 'General' }],
    },
    {
        value: 'electric-charges-fields',
        subject: 'Physics',
        label: 'Electric Charges and Fields',
        class_level: '12',
        subtopics: [{ value: 'electric-charges-fields-gen', label: 'General' }],
    },
    {
        value: 'electrostatic-potential-capacitance',
        subject: 'Physics',
        label: 'Electrostatic Potential and Capacitance',
        class_level: '12',
        subtopics: [{ value: 'pot-cap-gen', label: 'General' }],
    },
    {
        value: 'current-electricity',
        subject: 'Physics',
        label: 'Current Electricity',
        class_level: '12',
        subtopics: [{ value: 'current-electricity-gen', label: 'General' }],
    },
    {
        value: 'moving-charges-magnetism',
        subject: 'Physics',
        label: 'Moving Charges and Magnetism',
        class_level: '12',
        subtopics: [{ value: 'moving-charges-magnetism-gen', label: 'General' }],
    },
    {
        value: 'magnetism-and-matter',
        subject: 'Physics',
        label: 'Magnetism and Matter',
        class_level: '12',
        subtopics: [{ value: 'magnetism-and-matter-gen', label: 'General' }],
    },
    {
        value: 'electromagnetic-induction',
        subject: 'Physics',
        label: 'Electromagnetic Induction',
        class_level: '12',
        subtopics: [{ value: 'emi-gen', label: 'General' }],
    },
    {
        value: 'alternating-current',
        subject: 'Physics',
        label: 'Alternating Current',
        class_level: '12',
        subtopics: [{ value: 'ac-gen', label: 'General' }],
    },
    {
        value: 'electromagnetic-waves',
        subject: 'Physics',
        label: 'Electromagnetic Waves',
        class_level: '12',
        subtopics: [{ value: 'em-waves-gen', label: 'General' }],
    },
    {
        value: 'dual-nature-radiation-matter',
        subject: 'Physics',
        label: 'Dual Nature of Radiation and Matter',
        class_level: '12',
        subtopics: [{ value: 'dual-nature-gen', label: 'General' }],
    },
    {
        value: 'atoms',
        subject: 'Physics',
        label: 'Atoms',
        class_level: '12',
        subtopics: [{ value: 'atoms-gen', label: 'General' }],
    },
    {
        value: 'nuclei',
        subject: 'Physics',
        label: 'Nuclei',
        class_level: '12',
        subtopics: [{ value: 'nuclei-gen', label: 'General' }],
    },
    {
        value: 'semiconductor-electronics',
        subject: 'Physics',
        label: 'Semiconductor Electronics',
        class_level: '12',
        subtopics: [{ value: 'semiconductors-gen', label: 'General' }],
    },
    {
        value: 'communication-systems',
        subject: 'Physics',
        label: 'Communication Systems',
        class_level: '12',
        subtopics: [{ value: 'communication-systems-gen', label: 'General' }],
    },

    // ==================== CHEMISTRY (Class 11) ====================
    {
        value: 'atomic-structure',
        subject: 'Chemistry',
        label: 'Atomic Structure',
        class_level: '11',
        subtopics: [{ value: 'atomic-structure-gen', label: 'General' }],
    },
    {
        value: 'classification-of-elements-periodicity',
        subject: 'Chemistry',
        label: 'Classification of Elements & Periodicity',
        class_level: '11',
        subtopics: [{ value: 'classification-of-elements-gen', label: 'General' }],
    },
    {
        value: 'chemical-bonding-molecular-structure',
        subject: 'Chemistry',
        label: 'Chemical Bonding & Molecular Structure',
        class_level: '11',
        subtopics: [{ value: 'chemical-bonding-gen', label: 'General' }],
    },
    {
        value: 'states-of-matter',
        subject: 'Chemistry',
        label: 'States of Matter (Gases & Liquids)',
        class_level: '11',
        subtopics: [{ value: 'states-of-matter-gen', label: 'General' }],
    },
    {
        value: 'stoichiometry',
        subject: 'Chemistry',
        label: 'Stoichiometry',
        class_level: '11',
        subtopics: [{ value: 'stoichiometry-gen', label: 'General' }],
    },
    {
        value: 'thermodynamics-chem',
        subject: 'Chemistry',
        label: 'Thermodynamics',
        class_level: '11',
        subtopics: [{ value: 'thermodynamics-chem-gen', label: 'General' }],
    },
    {
        value: 'chemical-equilibrium-acids-bases',
        subject: 'Chemistry',
        label: 'Chemical Equilibrium & Acids–Bases',
        class_level: '11',
        subtopics: [{ value: 'chemical-equilibrium-acids-bases-gen', label: 'General' }],
    },
    {
        value: 'hydrogen-and-its-compounds',
        subject: 'Chemistry',
        label: 'Hydrogen and Its Compounds',
        class_level: '11',
        subtopics: [{ value: 'hydrogen-gen', label: 'General' }],
    },
    {
        value: 's-block-elements',
        subject: 'Chemistry',
        label: 's-Block Elements (Alkali & Alkaline Earth Metals)',
        class_level: '11',
        subtopics: [{ value: 's-block-gen', label: 'General' }],
    },
    {
        value: 'p-block-elements-group-13',
        subject: 'Chemistry',
        label: 'p-Block Elements – Group 13 (Boron Family)',
        class_level: '11',
        subtopics: [{ value: 'p-block-13-gen', label: 'General' }],
    },
    {
        value: 'p-block-elements-group-14',
        subject: 'Chemistry',
        label: 'p-Block Elements – Group 14 (Carbon Family)',
        class_level: '11',
        subtopics: [{ value: 'p-block-14-gen', label: 'General' }],
    },
    {
        value: 'environmental-chemistry',
        subject: 'Chemistry',
        label: 'Environmental Chemistry',
        class_level: '11',
        subtopics: [{ value: 'environmental-chemistry-gen', label: 'General' }],
    },
    {
        value: 'organic-chemistry-basic-principles',
        subject: 'Chemistry',
        label: 'Organic Chemistry – Some Basic Principles & Techniques',
        class_level: '11',
        subtopics: [{ value: 'organic-basic-principles-gen', label: 'General' }],
    },
    {
        value: 'hydrocarbons',
        subject: 'Chemistry',
        label: 'Hydrocarbons',
        class_level: '11',
        subtopics: [{ value: 'hydrocarbons-gen', label: 'General' }],
    },

    // ==================== CHEMISTRY (Class 12) ====================
    {
        value: 'solid-state',
        subject: 'Chemistry',
        label: 'Solid State',
        class_level: '12',
        subtopics: [{ value: 'solid-state-gen', label: 'General' }],
    },
    {
        value: 'solutions',
        subject: 'Chemistry',
        label: 'Solutions',
        class_level: '12',
        subtopics: [{ value: 'solutions-gen', label: 'General' }],
    },
    {
        value: 'electrochemistry',
        subject: 'Chemistry',
        label: 'Electrochemistry',
        class_level: '12',
        subtopics: [{ value: 'electrochemistry-gen', label: 'General' }],
    },
    {
        value: 'chemical-kinetics',
        subject: 'Chemistry',
        label: 'Chemical Kinetics',
        class_level: '12',
        subtopics: [{ value: 'chemical-kinetics-gen', label: 'General' }],
    },
    {
        value: 'surface-chemistry',
        subject: 'Chemistry',
        label: 'Surface Chemistry',
        class_level: '12',
        subtopics: [{ value: 'surface-chemistry-gen', label: 'General' }],
    },
    {
        value: 'metallurgy',
        subject: 'Chemistry',
        label: 'General Principles of Metallurgy',
        class_level: '12',
        subtopics: [{ value: 'metallurgy-gen', label: 'General' }],
    },
    {
        value: 'p-block-15-18',
        subject: 'Chemistry',
        label: 'p-Block Elements (Groups 15–18)',
        class_level: '12',
        subtopics: [{ value: 'p-block-15-18-gen', label: 'General' }],
    },
    {
        value: 'd-and-f-block',
        subject: 'Chemistry',
        label: 'd- and f-Block Elements and Coordination Compounds',
        class_level: '12',
        subtopics: [{ value: 'd-and-f-block-gen', label: 'General' }],
    },
    {
        value: 'polymers',
        subject: 'Chemistry',
        label: 'Polymers',
        class_level: '12',
        subtopics: [{ value: 'polymers-gen', label: 'General' }],
    },
    {
        value: 'biomolecules',
        subject: 'Chemistry',
        label: 'Biomolecules',
        class_level: '12',
        subtopics: [{ value: 'biomolecules-gen', label: 'General' }],
    },
    {
        value: 'chemistry-in-everyday-life',
        subject: 'Chemistry',
        label: 'Chemistry in Everyday Life',
        class_level: '12',
        subtopics: [{ value: 'chem-everyday-life-gen', label: 'General' }],
    },
    {
        value: 'haloalkanes-and-haloarenes',
        subject: 'Chemistry',
        label: 'Haloalkanes and Haloarenes',
        class_level: '12',
        subtopics: [{ value: 'haloalkanes-gen', label: 'General' }],
    },
    {
        value: 'alcohols-phenols-ethers',
        subject: 'Chemistry',
        label: 'Alcohols, Phenols and Ethers',
        class_level: '12',
        subtopics: [{ value: 'alcohols-gen', label: 'General' }],
    },
    {
        value: 'aldehydes-and-ketones',
        subject: 'Chemistry',
        label: 'Aldehydes and Ketones',
        class_level: '12',
        subtopics: [{ value: 'aldehydes-gen', label: 'General' }],
    },
    {
        value: 'carboxylic-acids',
        subject: 'Chemistry',
        label: 'Carboxylic Acids',
        class_level: '12',
        subtopics: [{ value: 'carboxylic-acids-gen', label: 'General' }],
    },
    {
        value: 'amines',
        subject: 'Chemistry',
        label: 'Amines',
        class_level: '12',
        subtopics: [{ value: 'amines-gen', label: 'General' }],
    },
    {
        value: 'diazonium-salts',
        subject: 'Chemistry',
        label: 'Diazonium Salts',
        class_level: '12',
        subtopics: [{ value: 'diazonium-salts-gen', label: 'General' }],
    },
    {
        value: 'cyanides-and-isocyanides',
        subject: 'Chemistry',
        label: 'Cyanides and Isocyanides',
        class_level: '12',
        subtopics: [{ value: 'cyanides-gen', label: 'General' }],
    },
];

export const EXAM_TAXONOMY: ExamDef[] = [
    {
        value: 'ap_eapcet',
        label: 'AP EAPCET',
        topics: JEE_MAIN_TOPICS,
    },
    {
        value: 'ts_eapcet',
        label: 'TG EAPCET',
        topics: JEE_MAIN_TOPICS,
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
