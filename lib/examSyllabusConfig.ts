export const EXAM_SYLLABUS_CONFIG: Record<string, {
    syllabus_rules: {
        class_11_whitelist: string[];
        class_12_whitelist: string[]; // Explicit list or "ALL_EXCEPT_11" logic
    };
    fetching_logic: {
        class_12_ratio: number; // e.g. 0.8
        class_11_ratio: number; // e.g. 0.2
    }
}> = {
    mht_cet: {
        syllabus_rules: {
            class_11_whitelist: [
                // Physics (8 Chapters)
                "motion-in-a-plane",
                "laws-of-motion",
                "gravitation",
                "thermal-properties-of-matter",
                "sound",
                "optics",
                "electrostatics", // Basic (Class 11 portion)
                "semiconductors",

                // Mathematics (10 Chapters)
                "trigonometry-ii",
                "straight-lines",
                "circles",
                "measures-of-dispersion",
                "probability",
                "complex-numbers",
                "permutations-and-combinations",
                "functions",
                "limits",
                "continuity",

                // Chemistry (11 Chapters)
                "some-basic-concepts-of-chemistry",
                "structure-of-atom",
                "chemical-bonding",
                "redox-reactions",
                "elements-of-group-1-and-2",
                "states-of-matter", // Gaseous and Liquids
                "adsorption-and-colloids",
                "hydrocarbons",
                "basic-principles-of-organic-chemistry",
                "chemistry-in-everyday-life",
                "introduction-to-analytical-chemistry" // Might map to existing 'analytical-chem'
            ],
            class_12_whitelist: [
                // Logic will be: If topic is NOT in whitelist, assume Class 12 for MHT CET context
                // OR explicitly list important ones like "rotational-dynamics"
                "rotational-dynamics",
                "mechanical-properties-of-fluids",
                "kinetic-theory-of-gases-and-radiation",
                "thermodynamics",
                "oscillations",
                "superposition-of-waves",
                "wave-optics",
                "electrostatics-12", // Advanced
                "current-electricity",
                "magnetic-fields-due-to-electric-current",
                "magnetic-materials",
                "electromagnetic-induction",
                "ac-circuits",
                "dual-nature-of-radiation-and-matter",
                "structure-of-atoms-and-nuclei"
            ]
        },
        fetching_logic: {
            class_12_ratio: 0.8,
            class_11_ratio: 0.2
        }
    }
};

/**
 * Helper to determine class level for a specific exam context
 */
export function getClassLevelForExam(examId: string, topic: string): '11' | '12' {
    const config = EXAM_SYLLABUS_CONFIG[examId];
    if (!config) return '12'; // Default to 12 if no config found (safe fallback?) or 11/12 mixed.

    // Strict Whitelist Check
    if (config.syllabus_rules.class_11_whitelist.includes(topic)) {
        return '11';
    }

    return '12';
}
