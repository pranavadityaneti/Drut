import { PHYSICS_VALIDATION_RULES } from './taxonomy/physicsRules';

/**
 * Universal Client-Side Validator
 * Checks if a question adheres to strict keywords for the given topic.
 * 
 * Logic:
 * 1. Find the rule for the topic.
 * 2. If no rule, allow (fallback).
 * 3. Check Forbidden (Strict Gate).
 * 4. Check Required (Must have at least one).
 */
export function isValidQuestionForTopic(topic: string, questionText: string): boolean {
    if (!topic || !questionText) return true;

    // Normalize topic implies title case match in dictionary
    // We assume 'topic' comes from our taxonomy (Title Case)
    // But let's handle case-insensitivity lookup just in case
    const ruleKeys = Object.keys(PHYSICS_VALIDATION_RULES);
    const matchedKey = ruleKeys.find(key => key.toLowerCase() === topic.toLowerCase());

    if (!matchedKey) {
        // console.warn(`[ClientValidator] No rules found for topic: '${topic}'. Allowing.`);
        return true;
    }

    const rule = PHYSICS_VALIDATION_RULES[matchedKey];
    const normalizedText = questionText.toLowerCase();

    // 1. Check FORBIDDEN (Fail Fast)
    for (const pattern of rule.forbidden) {
        if (pattern.test(normalizedText)) {
            console.warn(`[ClientValidator] Blocked '${topic}' question. Contains Forbidden pattern: ${pattern}`);
            return false;
        }
    }

    // 2. Check REQUIRED (Must have at least one)
    if (rule.required.length > 0) {
        const hasRequired = rule.required.some(pattern => pattern.test(normalizedText));
        if (!hasRequired) {
            console.warn(`[ClientValidator] Blocked '${topic}' question. Missing Required keywords.`);
            return false;
        }
    }

    return true;
}

// Deprecated: Kept for backward compatibility if imports exist, but should be removed.
export function isValidOscillationQuestion(questionText: string): boolean {
    return isValidQuestionForTopic('Oscillations', questionText);
}
