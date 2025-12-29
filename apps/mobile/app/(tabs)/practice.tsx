import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { authService, EXAM_TAXONOMY } from '@drut/shared';
import { ChevronDown, Check } from 'lucide-react-native';

const LEVELS = ['Easy', 'Medium', 'Hard'];

export default function PracticeScreen() {
    const [loading, setLoading] = useState(true);

    // User Data
    const [userExams, setUserExams] = useState<string[]>([]);

    // Selections
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

    // UI States
    const [showTopicPicker, setShowTopicPicker] = useState(false);
    const [showSubtopicPicker, setShowSubtopicPicker] = useState(false);

    useEffect(() => {
        const init = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                let exams = (user.user_metadata?.target_exams || []) as string[];

                // Fallback
                if (exams.length === 0 && user.user_metadata?.exam_profile) exams.push(user.user_metadata.exam_profile);

                // Normalization
                exams = exams.map(e => {
                    const clean = e.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (clean.includes('eapcet') || clean.includes('eamcet')) return 'eamcet';
                    return e;
                });
                exams = Array.from(new Set(exams));

                setUserExams(exams);

                // Auto-select
                if (exams.length > 0) {
                    setSelectedExam(exams[0]);
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    // Derived Logic
    const examDef = EXAM_TAXONOMY.find(e => e.value === selectedExam);

    // Topic Filtering
    // For mobile we simplify and just show all topics for the exam for now, can refine class logic later if needed
    const filteredTopics = examDef?.topics || [];
    const topicDef = filteredTopics.find(t => t.value === selectedTopic);

    const handleStart = () => {
        Alert.alert(
            "Ready to Practice?",
            `Config: ${selectedExam.toUpperCase()} \nTopic: ${selectedTopic} \nSubtopic: ${selectedSubtopic || 'Mixed'} \nDifficulty: ${difficulty}`,
            [{ text: "Let's Go!" }]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const isReady = selectedExam && selectedTopic;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Practice Arena</Text>
                <Text style={styles.headerSubtitle}>Configure your session</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Target Exam</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examList}>
                    {userExams.map(exam => {
                        const isSelected = selectedExam === exam;
                        return (
                            <TouchableOpacity
                                key={exam}
                                style={[styles.examChip, isSelected && styles.examChipSelected]}
                                onPress={() => {
                                    setSelectedExam(exam);
                                    setSelectedTopic('');
                                    setSelectedSubtopic('');
                                }}
                            >
                                <Text style={[styles.examChipText, isSelected && styles.examChipTextSelected]}>
                                    {exam.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Topic</Text>
                {filteredTopics.length > 0 ? (
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowTopicPicker(!showTopicPicker)}
                    >
                        <Text style={selectedTopic ? styles.dropdownText : styles.dropdownPlaceholder}>
                            {filteredTopics.find(t => t.value === selectedTopic)?.label || "Select a Topic"}
                        </Text>
                        <ChevronDown size={20} color={Colors.textDim} />
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.emptyText}>No topics available for this exam.</Text>
                )}

                {/* Simple Topic List Expansion */}
                {showTopicPicker && (
                    <View style={styles.pickerContainer}>
                        {filteredTopics.map(t => (
                            <TouchableOpacity
                                key={t.value}
                                style={styles.pickerItem}
                                onPress={() => {
                                    setSelectedTopic(t.value);
                                    setSelectedSubtopic('');
                                    setShowTopicPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.pickerItemText,
                                    selectedTopic === t.value && { color: Colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {t.label}
                                </Text>
                                {selectedTopic === t.value && <Check size={16} color={Colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Subtopic <Text style={styles.optional}>(Optional)</Text></Text>
                <TouchableOpacity
                    style={[styles.dropdown, (!selectedTopic || !topicDef?.subtopics?.length) && styles.disabled]}
                    disabled={!selectedTopic || !topicDef?.subtopics?.length}
                    onPress={() => setShowSubtopicPicker(!showSubtopicPicker)}
                >
                    <Text style={selectedSubtopic ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {topicDef?.subtopics.find(s => s.value === selectedSubtopic)?.label || "Mixed (All Subtopics)"}
                    </Text>
                    <ChevronDown size={20} color={Colors.textDim} />
                </TouchableOpacity>

                {showSubtopicPicker && topicDef && (
                    <View style={styles.pickerContainer}>
                        <TouchableOpacity
                            style={styles.pickerItem}
                            onPress={() => {
                                setSelectedSubtopic('');
                                setShowSubtopicPicker(false);
                            }}
                        >
                            <Text style={[
                                styles.pickerItemText,
                                selectedSubtopic === '' && { color: Colors.primary, fontWeight: 'bold' }
                            ]}>
                                Mixed (All Subtopics)
                            </Text>
                        </TouchableOpacity>
                        {topicDef.subtopics.map(s => (
                            <TouchableOpacity
                                key={s.value}
                                style={styles.pickerItem}
                                onPress={() => {
                                    setSelectedSubtopic(s.value);
                                    setShowSubtopicPicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.pickerItemText,
                                    selectedSubtopic === s.value && { color: Colors.primary, fontWeight: 'bold' }
                                ]}>
                                    {s.label}
                                </Text>
                                {selectedSubtopic === s.value && <Check size={16} color={Colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Difficulty</Text>
                <View style={styles.difficultyContainer}>
                    {LEVELS.map(level => {
                        const isSelected = difficulty === level;
                        return (
                            <TouchableOpacity
                                key={level}
                                style={[
                                    styles.difficultyButton,
                                    isSelected && styles.difficultyButtonSelected,
                                    isSelected && level === 'Easy' && { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
                                    isSelected && level === 'Medium' && { backgroundColor: '#fffbeb', borderColor: '#f59e0b' },
                                    isSelected && level === 'Hard' && { backgroundColor: '#fff1f2', borderColor: '#f43f5e' },
                                ]}
                                onPress={() => setDifficulty(level as any)}
                            >
                                <Text style={[
                                    styles.difficultyText,
                                    isSelected && level === 'Easy' && { color: '#047857' },
                                    isSelected && level === 'Medium' && { color: '#b45309' },
                                    isSelected && level === 'Hard' && { color: '#be123c' },
                                ]}>
                                    {level}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.startButton, !isReady && styles.startButtonDisabled]}
                    disabled={!isReady}
                    onPress={handleStart}
                >
                    <Text style={styles.startButtonText}>Start Session</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 16,
        color: Colors.textDim,
        marginTop: 4,
    },
    section: {
        padding: 20,
        paddingBottom: 0,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    optional: {
        color: Colors.textDim,
        fontWeight: 'normal',
    },
    examList: {
        gap: 12,
        paddingRight: 20,
    },
    examChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: Colors.white,
    },
    examChipSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#eef2ff',
    },
    examChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim,
    },
    examChipTextSelected: {
        color: Colors.primary,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
    },
    dropdownText: {
        fontSize: 15,
        color: Colors.text,
        fontWeight: '500',
    },
    dropdownPlaceholder: {
        fontSize: 15,
        color: Colors.textDim,
    },
    disabled: {
        backgroundColor: '#f8fafc',
        opacity: 0.7,
    },
    pickerContainer: {
        marginTop: 8,
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 8,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    pickerItemText: {
        fontSize: 15,
        color: Colors.text,
    },
    emptyText: {
        color: Colors.textDim,
        fontStyle: 'italic',
    },
    difficultyContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    difficultyButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: Colors.white,
    },
    difficultyButtonSelected: {
        borderWidth: 1,
    },
    difficultyText: {
        fontWeight: '600',
        color: Colors.textDim,
    },
    footer: {
        padding: 20,
        marginTop: 20,
    },
    startButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    startButtonDisabled: {
        backgroundColor: '#cbd5e1',
        shadowOpacity: 0,
    },
    startButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
