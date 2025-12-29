/**
 * SVG Sanitizer Utility
 * 
 * Cleans and validates AI-generated SVG strings before rendering.
 * Handles common issues from Gemini output:
 * - Literal \n characters
 * - HTML entities (&Omega; etc.)
 * - Missing/malformed tags
 */

export interface SvgSanitizerResult {
    valid: boolean;
    svg: string;
    error?: string;
}

// Common HTML entities to Unicode mappings
const HTML_ENTITIES: Record<string, string> = {
    // Greek letters (common in physics/math)
    '&Alpha;': 'Α', '&alpha;': 'α',
    '&Beta;': 'Β', '&beta;': 'β',
    '&Gamma;': 'Γ', '&gamma;': 'γ',
    '&Delta;': 'Δ', '&delta;': 'δ',
    '&Epsilon;': 'Ε', '&epsilon;': 'ε',
    '&Zeta;': 'Ζ', '&zeta;': 'ζ',
    '&Eta;': 'Η', '&eta;': 'η',
    '&Theta;': 'Θ', '&theta;': 'θ',
    '&Iota;': 'Ι', '&iota;': 'ι',
    '&Kappa;': 'Κ', '&kappa;': 'κ',
    '&Lambda;': 'Λ', '&lambda;': 'λ',
    '&Mu;': 'Μ', '&mu;': 'μ',
    '&Nu;': 'Ν', '&nu;': 'ν',
    '&Xi;': 'Ξ', '&xi;': 'ξ',
    '&Omicron;': 'Ο', '&omicron;': 'ο',
    '&Pi;': 'Π', '&pi;': 'π',
    '&Rho;': 'Ρ', '&rho;': 'ρ',
    '&Sigma;': 'Σ', '&sigma;': 'σ',
    '&Tau;': 'Τ', '&tau;': 'τ',
    '&Upsilon;': 'Υ', '&upsilon;': 'υ',
    '&Phi;': 'Φ', '&phi;': 'φ',
    '&Chi;': 'Χ', '&chi;': 'χ',
    '&Psi;': 'Ψ', '&psi;': 'ψ',
    '&Omega;': 'Ω', '&omega;': 'ω',

    // Common symbols
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
    '&infin;': '∞',
    '&ne;': '≠',
    '&le;': '≤',
    '&ge;': '≥',
    '&rarr;': '→',
    '&larr;': '←',
    '&uarr;': '↑',
    '&darr;': '↓',
    '&harr;': '↔',
    '&radic;': '√',
    '&sum;': '∑',
    '&int;': '∫',
    '&part;': '∂',
    '&prop;': '∝',
    '&ang;': '∠',
    '&perp;': '⊥',
    '&para;': '∥',

    // Numeric entity patterns will be handled separately
};

/**
 * Replace HTML entities with their Unicode equivalents
 */
function replaceHtmlEntities(svg: string): string {
    let result = svg;

    // Replace named entities
    for (const [entity, unicode] of Object.entries(HTML_ENTITIES)) {
        result = result.split(entity).join(unicode);
    }

    // Replace numeric entities like &#937; or &#x3A9;
    // Decimal: &#937; -> Ω
    result = result.replace(/&#(\d+);/g, (_, code) => {
        return String.fromCharCode(parseInt(code, 10));
    });

    // Hexadecimal: &#x3A9; -> Ω
    result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_, code) => {
        return String.fromCharCode(parseInt(code, 16));
    });

    return result;
}

/**
 * Sanitize and validate an SVG string
 */
export function sanitizeSvg(rawSvg: string | undefined | null): SvgSanitizerResult {
    // Handle null/undefined
    if (!rawSvg) {
        return {
            valid: false,
            svg: '',
            error: 'No diagram code provided',
        };
    }

    let svg = rawSvg;

    // 1. Remove literal \n characters (not actual newlines)
    svg = svg.replace(/\\n/g, '');

    // 2. Trim whitespace and actual newlines
    svg = svg.trim();

    // 3. Replace HTML entities with Unicode
    svg = replaceHtmlEntities(svg);

    // 4. Remove any leading/trailing quotes that might be present
    if ((svg.startsWith('"') && svg.endsWith('"')) ||
        (svg.startsWith("'") && svg.endsWith("'"))) {
        svg = svg.slice(1, -1);
    }

    // 5. Validate structure
    const startsWithSvg = svg.trim().toLowerCase().startsWith('<svg');
    const endsWithSvg = svg.trim().toLowerCase().endsWith('</svg>');

    if (!startsWithSvg) {
        return {
            valid: false,
            svg: '',
            error: 'SVG does not start with <svg> tag',
        };
    }

    if (!endsWithSvg) {
        return {
            valid: false,
            svg: '',
            error: 'SVG does not end with </svg> tag',
        };
    }

    // 6. Basic tag balance check - LENIENT VERSION
    // AI-generated SVGs often have complex structures that pass browser parsing
    // but fail simple regex-based balance checks. We'll trust the browser
    // to handle parsing and only reject obviously broken SVGs.

    // Check for completely broken cases (e.g., truncated SVG)
    const lastTagMatch = svg.match(/<\/?\w+[^>]*$/);
    if (lastTagMatch) {
        // SVG ends with an incomplete tag
        return {
            valid: false,
            svg: '',
            error: 'SVG appears to be truncated',
        };
    }

    // If it starts with <svg and ends with </svg>, trust the browser to render it
    // This is more permissive but prevents false rejections of valid complex SVGs

    return {
        valid: true,
        svg,
    };
}

export default sanitizeSvg;
