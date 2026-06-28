import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { Colors } from '../../constants/Colors'; // Adjust path if needed
import { X, CheckCircle, AlertTriangle, Play, ArrowRight, Zap, BookOpen, ChevronDown, ChevronRight } from 'lucide-react-native';
import { LatexText } from '../ui/LatexText';

interface InterventionModalProps {
    visible: boolean;
    question: any;
    onTrySimilar: () => void;
    onContinue: () => void;
}

export const InterventionModal: React.FC<InterventionModalProps> = ({ visible, question, onTrySimilar, onContinue }) => {
    const [activeTab, setActiveTab] = useState<'optimal' | 'solution'>('optimal');
    const [expandedPhase, setExpandedPhase] = useState<string>('DIAGNOSE');
    const [showFullSteps, setShowFullSteps] = useState(false);
    const { height } = Dimensions.get('window');

    // Support old schema (optimal_path/full_solution), intermediate (theOptimalPath/fullStepByStep),
    // and the new "B+C mix" format (quickMethod / fullSolution{approach,steps[{text,display}],answer}).
    const optimalPath = question?.theOptimalPath || question?.optimal_path;
    const fullSolution = question?.fullStepByStep || question?.full_solution;
    const fsmExplanation = question?.fsm_explanation;
    // New format (clean Quick Method + concept-led Full Solution, no framework labels)
    const quickMethod = question?.quickMethod;
    const newFullSolution = question?.fullSolution;
    const isNewFormat = !!(quickMethod?.steps?.length || newFullSolution?.steps?.length);
    const hasOptimalPath = optimalPath && (optimalPath.exists || optimalPath.available || optimalPath.steps?.length > 0);
    const hasFullSolution = fullSolution && (fullSolution.phases?.length > 0 || fullSolution.steps?.length > 0);
    const isLegacyData = !optimalPath && !fullSolution && !isNewFormat;

    // Reset state when question changes
    React.useEffect(() => {
        if (!isLegacyData && (hasOptimalPath || quickMethod?.steps?.length)) {
            setActiveTab('optimal');
        } else {
            setActiveTab('solution');
        }
        setExpandedPhase('DIAGNOSE');
        setShowFullSteps(false);
    }, [question, visible]);

    if (!visible || !question) return null;

    // --- RENDERERS ---

    const renderLegacyContent = () => {
        // Fallback for old data - No warning banner, just content.
        return (
            <View style={styles.tabContent}>
                <Text style={styles.sectionHeader}>Solution</Text>
                <View style={styles.solutionBox}>
                    <LatexText
                        text={question.solution || "Step-by-step solution available below."}
                        fontSize={15}
                        color={Colors.text}
                    />
                </View>
            </View>
        );
    };

    const renderTAR = () => {
        if (!hasOptimalPath) {
            return (
                <View style={[styles.tabContent, { alignItems: 'center', paddingTop: 20 }]}>
                    <AlertTriangle size={32} color={Colors.textDim} />
                    <Text style={{ marginTop: 12, color: Colors.textDim, fontSize: 16 }}>Calculation Required</Text>
                    <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 4 }}>
                        No shortcut available for this problem. Use the Full Solution tab.
                    </Text>
                </View>
            );
        }

        const steps = optimalPath.steps || [];

        return (
            <View style={styles.tabContent}>
                <View style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: 1.5,
                    }}>
                        Quick Method
                    </Text>
                </View>
                {steps.map((step: any, i: number) => {
                    const stepText = typeof step === 'string' ? step : step.text || step.action || JSON.stringify(step);
                    return (
                        <View key={i} style={styles.stepRow}>
                            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
                            <View style={{ flex: 1 }}>
                                <LatexText text={stepText} fontSize={15} color={Colors.text} />
                            </View>
                        </View>
                    );
                })}

                {/* Sanity Check */}
                {optimalPath.sanityCheck && (
                    <View style={{ marginTop: 8, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d', marginBottom: 4 }}>SANITY CHECK</Text>
                        <LatexText text={optimalPath.sanityCheck} fontSize={14} color="#15803d" />
                    </View>
                )}

                {/* Why-it-works explanation */}
                {fsmExplanation && (
                    <View style={{ marginTop: 12, padding: 12, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginBottom: 4 }}>PATTERN</Text>
                        <LatexText text={fsmExplanation} fontSize={14} color="#1e40af" />
                    </View>
                )}

                {/* Full Step-by-Step Toggle */}
                {hasFullSolution && (
                    <View style={{ marginTop: 16 }}>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 10,
                                backgroundColor: '#f8fafc',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                            }}
                            onPress={() => setShowFullSteps(!showFullSteps)}
                        >
                            <BookOpen size={16} color={Colors.textDim} />
                            <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: Colors.textDim }}>
                                {showFullSteps ? 'Hide' : 'Show'} full step-by-step solution
                            </Text>
                        </TouchableOpacity>

                        {showFullSteps && renderFullSteps()}
                    </View>
                )}
            </View>
        );
    };

    const renderFullSteps = () => {
        // New schema: fullStepByStep.steps[]
        const steps = fullSolution?.steps || [];
        if (steps.length === 0) return null;

        return (
            <View style={{ marginTop: 12, gap: 10 }}>
                {steps.map((step: any, i: number) => {
                    const stepText = typeof step === 'string' ? step : step.text || step.explanation || JSON.stringify(step);
                    return (
                        <View key={i} style={styles.stepRow}>
                            <View style={[styles.stepNumber, { backgroundColor: '#fef3c7' }]}>
                                <Text style={[styles.stepNumberText, { color: '#b45309' }]}>{i + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <LatexText text={stepText} fontSize={14} color={Colors.text} />
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderDEEP = () => {
        // Handle both old schema (phases) and new schema (steps)
        if (!fullSolution?.phases && !fullSolution?.steps) return <Text style={{ color: Colors.textDim }}>No full solution available.</Text>;

        // If only steps (new schema), render as numbered list
        if (!fullSolution.phases && fullSolution.steps) {
            return (
                <View style={styles.tabContent}>
                    <View style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                            Full Step-by-Step Solution
                        </Text>
                    </View>
                    {fullSolution.steps.map((step: any, i: number) => {
                        const stepText = typeof step === 'string' ? step : step.text || step.explanation || JSON.stringify(step);
                        return (
                            <View key={i} style={styles.stepRow}>
                                <View style={[styles.stepNumber, { backgroundColor: '#fef3c7' }]}>
                                    <Text style={[styles.stepNumberText, { color: '#b45309' }]}>{i + 1}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <LatexText text={stepText} fontSize={15} color={Colors.text} />
                                </View>
                            </View>
                        );
                    })}
                    {fsmExplanation && (
                        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginBottom: 4 }}>PATTERN</Text>
                            <LatexText text={fsmExplanation} fontSize={14} color="#1e40af" />
                        </View>
                    )}
                </View>
            );
        }

        if (!fullSolution?.phases) return <Text style={{ color: Colors.textDim }}>No full solution available.</Text>;

        return (
            <View style={styles.tabContent}>
                <View style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#64748b', // slate-500
                        textTransform: 'uppercase',
                        letterSpacing: 1.5
                    }}>
                        Full Solution
                    </Text>
                </View>

                {fullSolution.phases.map((phase: any, index: number) => {
                    const isExpanded = expandedPhase === phase.label;
                    const getIcon = () => {
                        switch (phase.label) {
                            case 'DIAGNOSE': return <BookOpen size={16} color={isExpanded ? Colors.primary : Colors.textDim} />;
                            case 'EXTRACT': return <CheckCircle size={16} color={isExpanded ? Colors.primary : Colors.textDim} />;
                            case 'EXECUTE': return <Zap size={16} color={isExpanded ? Colors.primary : Colors.textDim} />;
                            case 'PROOF': return <CheckCircle size={16} color={isExpanded ? Colors.primary : Colors.textDim} />;
                            default: return null;
                        }
                    };

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[styles.accordionItem, isExpanded && styles.accordionItemActive]}
                            onPress={() => setExpandedPhase(isExpanded ? '' : phase.label)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.accordionHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    {getIcon()}
                                    <Text style={[styles.accordionTitle, isExpanded && { color: Colors.primary }]}>{phase.label}</Text>
                                </View>
                                {isExpanded ? <ChevronDown size={18} color={Colors.textDim} /> : <ChevronRight size={18} color={Colors.textDim} />}
                            </View>

                            {isExpanded && (
                                <View style={styles.accordionContent}>
                                    <LatexText text={phase.content} fontSize={15} color={Colors.text} />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // New "B+C mix" Quick Method: 3 clean steps, no framework label
    const renderNewQuick = () => {
        const steps = quickMethod?.steps || [];
        if (steps.length === 0) {
            return (
                <View style={[styles.tabContent, { alignItems: 'center', paddingTop: 20 }]}>
                    <AlertTriangle size={32} color={Colors.textDim} />
                    <Text style={{ marginTop: 12, color: Colors.textDim, fontSize: 16 }}>Use the Full Solution tab.</Text>
                </View>
            );
        }
        return (
            <View style={styles.tabContent}>
                {steps.map((step: string, i: number) => (
                    <View key={i} style={styles.stepRow}>
                        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
                        <View style={{ flex: 1 }}>
                            <LatexText text={step} fontSize={15} color={Colors.text} />
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    // New "B+C mix" Full Solution: concept-led approach → flowing chunks (text + optional
    // centered display equation) → answer. No phase labels, no step numbers.
    const renderNewFull = () => {
        const fs = newFullSolution;
        if (!fs) return <Text style={{ color: Colors.textDim }}>No full solution available.</Text>;
        return (
            <View style={styles.tabContent}>
                {fs.approach ? (
                    <View style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#22c55e', marginBottom: 12 }}>
                        <LatexText text={fs.approach} fontSize={14} color={Colors.text} />
                    </View>
                ) : null}
                {(fs.steps || []).map((chunk: any, i: number) => (
                    <View key={i} style={{ marginBottom: 10 }}>
                        <LatexText text={chunk.text} fontSize={15} color={Colors.text} />
                        {chunk.display ? (
                            <LatexText text={`$$${chunk.display}$$`} fontSize={15} color={Colors.text} />
                        ) : null}
                    </View>
                ))}
                {fs.answer ? (
                    <View style={{ marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803d', marginBottom: 4 }}>ANSWER</Text>
                        <LatexText text={fs.answer} fontSize={15} color={Colors.text} />
                    </View>
                ) : null}
            </View>
        );
    };

    const renderContent = () => {
        if (isLegacyData) return renderLegacyContent();
        if (isNewFormat) return activeTab === 'optimal' ? renderNewQuick() : renderNewFull();
        return activeTab === 'optimal' ? renderTAR() : renderDEEP();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onContinue}
        >
            <View style={styles.overlay}>
                {/* Bottom Sheet Container */}
                <View style={[styles.container, { height: height * 0.75 }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={24} color="#ef4444" />
                            <Text style={styles.headerTitle}>Incorrect</Text>
                        </View>
                    </View>

                    {/* Tabs - HIDE if legacy */}
                    {!isLegacyData && (
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'optimal' && styles.activeTab]}
                                onPress={() => setActiveTab('optimal')}
                            >
                                <Text style={[styles.tabText, activeTab === 'optimal' && styles.activeTabText]}>
                                    {'⚡ Quick Method'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'solution' && styles.activeTab]}
                                onPress={() => setActiveTab('solution')}
                            >
                                <Text style={[styles.tabText, activeTab === 'solution' && styles.activeTabText]}>
                                    📖 Full Solution
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Scrollable Body */}
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 10 }}>

                        {/* Answer Card (New) */}
                        <View style={styles.answerCard}>
                            <View style={styles.answerHeader}>
                                <CheckCircle size={16} color="#15803d" />
                                <Text style={styles.answerLabel}>Correct Answer</Text>
                            </View>
                            <View style={styles.answerContent}>
                                <LatexText
                                    text={question.options?.[question.correctOptionIndex]?.text || question.options?.[question.correctOptionIndex]?.value || "Option " + (['A', 'B', 'C', 'D'][question.correctOptionIndex])}
                                    fontSize={18}
                                    color="#15803d" // Dark Green
                                />
                            </View>
                        </View>

                        {renderContent()}
                    </ScrollView>

                    {/* Sticky Footer */}
                    <View style={styles.footer}>
                        {/* "Try Similar" button hidden until the mini-drill feature ships.
                            Was showing Alert.alert('Coming Soon') — fake CTA broke trust. */}

                        <TouchableOpacity style={[styles.continueButton, { flex: 1 }]} onPress={onContinue}>
                            <Text style={styles.continueText}>Continue Practice</Text>
                            <ArrowRight size={18} color={Colors.textDim} />
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: '#fef2f2', // Light red bg for incorrect
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#ef4444',
    },
    correctAnswerPill: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#22c55e',
    },
    correctAnswerText: {
        color: '#15803d',
        fontWeight: 'bold',
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
        margin: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim,
    },
    activeTabText: {
        color: Colors.primary,
    },
    disabledTabText: {
        color: '#cbd5e1',
    },
    tabContent: {
        gap: 16,
    },
    patternBox: {
        backgroundColor: '#eff6ff', // light blue
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    patternLabel: {
        fontSize: 12,
        color: '#3b82f6',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    patternText: {
        fontSize: 16,
        color: '#1e40af',
        fontWeight: '600',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    stepRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#e0f2fe',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#0284c7',
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        color: Colors.text,
        lineHeight: 22,
    },
    solutionBox: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 12,
    },
    solutionText: {
        fontSize: 15,
        color: Colors.text,
        lineHeight: 24,
    },
    footer: {
        padding: 20,
        paddingBottom: 40, // Safe area
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: 12,
        backgroundColor: 'white',
    },
    proveItButton: {
        backgroundColor: '#16a34a', // Green
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: "#16a34a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    proveItText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    continueButton: {
        paddingVertical: 12,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    continueText: {
        color: Colors.textDim,
        fontSize: 15,
        fontWeight: '500',
    },
    answerCard: {
        backgroundColor: '#f0fdf4', // Light green
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden'
    },
    answerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    answerLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803d',
        textTransform: 'uppercase',
    },
    answerContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 4,
    },
    methodHeader: {
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    methodTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.textDim,
        letterSpacing: 1,
        textTransform: 'uppercase',
        fontVariant: ['small-caps']
    },
    accordionItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        marginBottom: 8
    },
    accordionItemActive: {
        borderColor: Colors.primary,
        backgroundColor: '#f8fafc'
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    accordionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.textDim,
        letterSpacing: 0.5
    },
    accordionContent: {
        padding: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 4,
    }
});
