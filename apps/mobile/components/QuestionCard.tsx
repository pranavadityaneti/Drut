import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors, Layout } from '../constants/Colors';
import { DiagramRenderer } from './DiagramRenderer';
import { LatexText } from './ui/LatexText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuestionCardProps {
    question: any; // Using any for now to avoid bulky type imports, define strictly later
    selectedAnswer: string | null;
    isSubmitted: boolean;
    onSelectAnswer: (optionId: string) => void;
}

const HTML_HEAD = `
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\[', right: '\\\\]', display: true}
        ],
        throwOnError: false
    });"></script>
    <style>
        body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 16px; line-height: 1.5; color: #1A1A1A; padding: 0; margin: 0; }
        p { margin-bottom: 12px; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        .katex { font-size: 1.1em; }
    </style>
</head>
`;

export const QuestionCard: React.FC<QuestionCardProps> = ({
    question,
    selectedAnswer,
    isSubmitted,
    onSelectAnswer
}) => {
    // Generate HTML for the WebView
    const htmlContent = `
        <!DOCTYPE html>
        <html>
            ${HTML_HEAD}
            <body>
                ${question?.text || question?.questionText || ''}
            </body>
        </html>
    `;

    // Calculate dynamic height for options based on state
    const getOptionStyle = (optionId: string, index: number) => {
        const isSelected = selectedAnswer === optionId;
        const isCorrect = index === question.correctOptionIndex;

        if (isSubmitted) {
            // ONLY highlight the selected option
            if (isSelected) {
                return isCorrect ? styles.optionCorrect : styles.optionWrong;
            }
            // Do NOT highlight the unselected correct answer (Single Highlight Mode)
            return styles.optionDefault;
        } else if (isSelected) {
            return styles.optionSelected;
        }

        return styles.optionDefault;
    };

    const getOptionTextStyle = (optionId: string, index: number) => {
        const isSelected = selectedAnswer === optionId;
        const isCorrect = index === question.correctOptionIndex;

        if (isSubmitted) {
            // If selected, show Green (if correct) or Red (if wrong)
            if (isSelected) {
                return isCorrect ? { fontWeight: '600' as const, color: '#15803d' } : { fontWeight: '600' as const, color: '#b91c1c' };
            }
            // If NOT selected, ensure we do NOT reveal the correct answer via text color either.
            // Keep it default text color.
            return { color: Colors.text };
        }

        return isSelected ? { fontWeight: '600' as const, color: Colors.primary } : { color: Colors.black };
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Diagram (if present) */}
            {question.diagramUrl && (
                <DiagramRenderer diagramUrl={question.diagramUrl} />
            )}

            {/* Question Text (Rich Content) */}
            <View style={styles.webViewContainer}>
                <LatexText
                    text={question.text || question.questionText || "Question text error"}
                    fontSize={18}
                    color={Colors.text}
                />
            </View>

            {/* Options List */}
            <Text style={{ marginBottom: 8, color: Colors.textDim, fontSize: 14 }}>Select the correct option:</Text>
            <View style={styles.optionsList}>
                {question.options?.map((opt: any, index: number) => {
                    // Safety check for ID
                    const optionId = opt.id || opt.label || `opt-${index}`;
                    return (
                        <TouchableOpacity
                            key={optionId}
                            style={[styles.optionCard, getOptionStyle(optionId, index)]}
                            onPress={() => !isSubmitted && onSelectAnswer(optionId)}
                            activeOpacity={isSubmitted ? 1 : 0.7}
                        >
                            <View style={[styles.optionIndicator, getOptionStyle(optionId, index), { backgroundColor: 'transparent', borderWidth: 1 }]}>
                                {/* Show A, B, C, D or just the ID */}
                                <Text style={[styles.optionLabel, getOptionTextStyle(optionId, index)]}>{String.fromCharCode(65 + index)}</Text>
                            </View>
                            <View style={styles.optionContent}>
                                <LatexText
                                    text={opt.text || opt.value || ''}
                                    fontSize={16}
                                    color={getOptionTextStyle(optionId, index).color}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    contentContainer: {
        padding: Layout.spacing.m,
        paddingBottom: 40,
    },
    webViewContainer: {
        minHeight: 60, // Minimum height to prevent total collapse, but dynamic otherwise
        marginBottom: Layout.spacing.l,
    },
    webView: {
        backgroundColor: 'transparent',
        flex: 1,
    },
    optionsList: {
        gap: Layout.spacing.m,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: Layout.spacing.m,
        borderRadius: Layout.radius.m,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    optionDefault: {
        borderColor: Colors.border,
        backgroundColor: Colors.white,
    },
    optionSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#f0fdf4', // Light green bg
    },
    optionCorrect: {
        borderColor: '#22c55e', // Success Green
        backgroundColor: '#dcfce7',
    },
    optionWrong: {
        borderColor: '#ef4444', // Error Red
        backgroundColor: '#fee2e2',
    },
    optionIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Layout.spacing.m,
        borderColor: Colors.border,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim,
    },
    optionContent: {
        flex: 1,
    },
    optionText: {
        fontSize: 16,
        color: Colors.text,
    },
});
