
// Difficulty is UNCALIBRATED pre-launch: every question is stored with a neutral
// 'Medium' placeholder (no real Easy/Hard exist yet), and research shows pre-data
// difficulty labels are unreliable (see docs/difficulty-rating-research.html). So we
// HIDE the Easy/Medium/Hard selector + in-session badge until the Elo/empirical engine
// calibrates difficulty from real student attempts. Flip to true to re-enable once
// calibrated difficulties exist in the bank.
export const DIFFICULTY_SELECTION_ENABLED = false;

// Beta scope: ONLY EAPCET (AP + TG; the grouped 'eamcet' value maps to
// ap_eapcet + ts_eapcet downstream) and JEE Main. CAT / NEET / others removed.
export const EXAM_PROFILES = [
  { value: 'eamcet', label: 'AP/TG EAPCET' },
  { value: 'jee_main', label: 'JEE Main' },
];

export const EXAM_SPECIFIC_TOPICS: { [key: string]: { value: string; label: string; subTopics: string[] }[] } = {
  cat: [
    { 
      value: 'Arithmetic - Percentages, Profit & Loss', 
      label: 'Percentages, Profit & Loss', 
      subTopics: ['Basics & Calculations', 'Successive Percentage Change', 'Profit, Loss & Discount', 'Applications'] 
    },
    { 
      value: 'Arithmetic - Ratios, Averages, Mixtures', 
      label: 'Ratios, Averages, Mixtures', 
      subTopics: ['Ratio & Proportion', 'Averages & Weighted Averages', 'Mixtures & Alligations', 'Partnership'] 
    },
    {
      value: 'Arithmetic - TSD & Work',
      label: 'Time, Speed, Distance & Work',
      subTopics: ['Time & Work', 'Pipes & Cisterns', 'Time, Speed & Distance Basics', 'Relative Speed & Boats']
    },
    { 
      value: 'Arithmetic - SI & CI', 
      label: 'Simple & Compound Interest',
      subTopics: ['Calculating SI & CI', 'Difference between SI & CI', 'Installments', 'Growth & Depreciation']
    },
    { 
      value: 'Algebra', 
      label: 'Algebra',
      subTopics: ['Linear & Quadratic Equations', 'Inequalities & Modulus', 'Logarithms & Exponents', 'Functions', 'Sequences & Series']
    },
    { 
      value: 'Number Systems', 
      label: 'Number Systems',
      subTopics: ['Divisibility & Remainders', 'Factors & Multiples (HCF/LCM)', 'Unit Digits & Base System', 'Cyclicity']
    },
    { 
      value: 'Geometry and Mensuration', 
      label: 'Geometry & Mensuration',
      subTopics: ['Lines, Angles & Triangles', 'Circles & Quadrilaterals', '2D & 3D Mensuration', 'Coordinate Geometry']
    },
    { 
      value: 'Modern Math', 
      label: 'Modern Math',
      subTopics: ['Permutations & Combinations', 'Probability', 'Set Theory & Venn Diagrams']
    },
  ],
  jee_main: [
    { 
      value: 'Quadratic Equations', 
      label: 'Quadratic Equations',
      subTopics: ['Nature of Roots', 'Sum and Product of Roots', 'Transformation of Equations', 'Location of Roots']
    },
    { 
      value: 'Complex Numbers', 
      label: 'Complex Numbers',
      subTopics: ['Algebra of Complex Numbers', 'Modulus and Argument', 'De Moivre\'s Theorem', 'Roots of Unity']
    },
    { 
      value: 'Sequences and Series', 
      label: 'Sequences & Series',
      subTopics: ['Arithmetic Progression (AP)', 'Geometric Progression (GP)', 'Harmonic Progression (HP)', 'Sum of Special Series']
    },
    { 
      value: 'Probability', 
      label: 'Probability',
      subTopics: ['Basic Probability', 'Conditional Probability', 'Bayes\' Theorem', 'Binomial Distribution']
    },
  ],
  eamcet: [
    { 
      value: 'Algebra', 
      label: 'Algebra',
      subTopics: ['Functions', 'Matrices', 'Complex Numbers', 'Quadratic Expressions']
    },
    { 
      value: 'Trigonometry', 
      label: 'Trigonometry',
      subTopics: ['Trigonometric Ratios', 'Properties of Triangles', 'Inverse Trigonometric Functions', 'Hyperbolic Functions']
    },
    { 
      value: 'Vector Algebra', 
      label: 'Vector Algebra',
      subTopics: ['Addition of Vectors', 'Scalar (Dot) Product', 'Vector (Cross) Product', 'Scalar Triple Product']
    },
    { 
      value: 'Probability', 
      label: 'Probability',
      subTopics: ['Measures of Dispersion', 'Basic Probability', 'Random Variables', 'Probability Distributions']
    },
  ],
};
