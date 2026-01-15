const fs = require('fs');
const path = require('path');

const taxonomyPath = path.join(__dirname, '../packages/shared/src/lib/taxonomy.ts');
let content = fs.readFileSync(taxonomyPath, 'utf8');

// Subject mapping - comprehensive list
const subjectMap = {
    // CAT -  Quantitative Aptitude
    'percentages-profit-loss': 'Quantitative Aptitude',
    'ratios-averages-mixtures': 'Quantitative Aptitude',
    'time-speed-distance-work': 'Quantitative Aptitude',
    'simple-compound-interest': 'Quantitative Aptitude',
    'algebra': 'Mathematics',  // Context dependent - will handle specially
    'number-systems': 'Quantitative Aptitude',
    'geometry-mensuration': 'Quantitative Aptitude',
    'modern-math': 'Quantitative Aptitude',

    // JEE/EAMCET Mathematics
    'sets-relations-functions': 'Mathematics',
    'quadratic-equations': 'Mathematics',
    'complex-numbers': 'Mathematics',
    'sequences-and-series': 'Mathematics',
    'permutations-combinations': 'Mathematics',
    'binomial-theorem': 'Mathematics',
    'straight-lines': 'Mathematics',
    'conic-sections': 'Mathematics',
    'trigonometry': 'Mathematics',
    'matrices-determinants': 'Mathematics',
    'limits-continuity-differentiability': 'Mathematics',
    'application-of-derivatives': 'Mathematics',
    'integrals': 'Mathematics',
    'differential-equations': 'Mathematics',
    'vectors': 'Mathematics',
    '3d-geometry': 'Mathematics',
    'probability': 'Mathematics',
    'vector-algebra': 'Mathematics',
    'calculus': 'Mathematics',
    'coordinate-geometry': 'Mathematics',
    'trigonometry-ii': 'Mathematics',
    'circles': 'Mathematics',
    'integration': 'Mathematics',
    'differentiation': 'Mathematics',
    'class-12-math': 'Mathematics',

    // Physics
    'units-measurements': 'Physics',
    'kinematics': 'Physics',
    'laws-of-motion': 'Physics',
    'work-energy-power': 'Physics',
    'rotational-motion': 'Physics',
    'gravitation': 'Physics',
    'oscillations-waves': 'Physics',
    'electrostatics': 'Physics',
    'current-electricity': 'Physics',
    'magnetism': 'Physics',
    'electromagnetic-induction': 'Physics',
    'optics': 'Physics',
    'modern-physics': 'Physics',
    'thermodynamics-phy': 'Physics',
    'solids-fluids': 'Physics',
    'motion-in-a-plane': 'Physics',

    // Chemistry
    'atomic-structure': 'Chemistry',
    'chemical-bonding': 'Chemistry',
    'states-of-matter': 'Chemistry',
    'thermodynamics-chem': 'Chemistry',
    'equilibrium': 'Chemistry',
    'electrochemistry': 'Chemistry',
    'chemical-kinetics': 'Chemistry',
    'organic-chemistry': 'Chemistry',
    'coordination-compounds': 'Chemistry',
    'physical-chemistry': 'Chemistry',
    'inorganic-chemistry': 'Chemistry',
};

// Find all topic blocks and add subject if missing
const lines = content.split('\n');
const result = [];
let inCatSection = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track if we're in CAT section for algebra handling
    if (line.includes("value: 'cat'")) inCatSection = true;
    if (line.includes("value: 'jee_main'") || line.includes("value: 'eamcet'")) inCatSection = false;

    // Check if this line has value: 'xxx',
    const valueMatch = line.match(/(\s+)value: '([^']+)',/);
    if (valueMatch && i + 1 < lines.length) {
        const indent = valueMatch[1];
        const topicValue = valueMatch[2];
        const nextLine = lines[i + 1];

        // Check if next line is NOT subject: (could be label:, could be anything)
        if (!nextLine.includes('subject:')) {
            let subject = subjectMap[topicValue] || 'Mathematics';

            // Special handling for algebra in CAT context
            if (topicValue === 'algebra' && inCatSection) {
                subject = 'Quantitative Aptitude';
            }

            result.push(line);
            result.push(`${indent}subject: '${subject}',`);
            continue;
        }
    }

    result.push(line);
}

fs.writeFileSync(taxonomyPath, result.join('\n'), 'utf8');
console.log('Added missing subject fields!');
