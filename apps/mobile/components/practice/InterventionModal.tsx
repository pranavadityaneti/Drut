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
    const [expandedPhase, setExpandedPhase] = useState<string>('DIAGNOSE'); // Accordion state
    const { height } = Dimensions.get('window');

    const isLegacyData = !question?.optimal_path && !question?.full_solution;

    // Reset state when question changes
    React.useEffect(() => {
        if (!isLegacyData && question?.optimal_path?.available) {
            setActiveTab('optimal');
        } else {
            setActiveTab('solution');
        }
        setExpandedPhase('DIAGNOSE');
    }, [question, visible, isLegacyData]);

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
        if (!question.optimal_path || !question.optimal_path.available) {
            return (
                <View style={[styles.tabContent, { alignItems: 'center', paddingTop: 20 }]}>
                    <AlertTriangle size={32} color={Colors.textDim} />
                    <Text style={{ marginTop: 12, color: Colors.textDim, fontSize: 16 }}>Calculation Required</Text>
                    <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 4 }}>
                        No shortcut available for this problem. Use the D.E.E.P. method.
                    </Text>
                </View>
            );
        }

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
                        The T.A.R. Algorithm™
                    </Text>
                </View>
                {question.optimal_path.steps.map((step: string, i: number) => (
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

    const renderDEEP = () => {
        if (!question.full_solution?.phases) return <Text>No full solution available.</Text>;

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
                        The D.E.E.P. Framework™
                    </Text>
                </View>

                {question.full_solution.phases.map((phase: any, index: number) => {
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

    const renderContent = () => {
        if (isLegacyData) return renderLegacyContent();
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
                                    ⚡ Optimal Path
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
                        <TouchableOpacity style={styles.proveItButton} onPress={onTrySimilar}>
                            <Play size={20} color="white" fill="white" />
                            <Text style={styles.proveItText}>Try Similar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
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
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 4,
        paddingTop: 12
    }
});
