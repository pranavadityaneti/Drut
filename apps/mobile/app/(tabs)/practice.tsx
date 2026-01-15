import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { authService, EXAM_TAXONOMY } from '@drut/shared';
// @ts-ignore
import { supabase } from '@drut/shared';
import { ChevronDown, Check } from 'lucide-react-native';

const LEVELS = ['Easy', 'Medium', 'Hard'];

export default function PracticeScreen() {
    const [loading, setLoading] = useState(true);

    // Configuration from Shared Taxonomy
    const EXAMS = EXAM_TAXONOMY.map(e => e.label);
    const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry'];

    // Selections
    const [selectedExam, setSelectedExam] = useState<string>(EXAMS[0]);
    const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]);
    const [selectedTopic, setSelectedTopic] = useState<string>('');

    // Dynamic Topics
    const [dynamicTopics, setDynamicTopics] = useState<any[]>([]);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

    // UI States
    const [showTopicPicker, setShowTopicPicker] = useState(false);

    useEffect(() => {
        // Just simulate loading for a moment or remove loading entirely if not needed
        // For now, we keep it simple
        setLoading(false);
    }, []);

    // Fetch Dynamic Topics
    useEffect(() => {
        const fetchDynamic = async () => {
            // Fetch topics from knowledge_nodes
            // We will filter by subject locally or in query if possible, but let's stick to the previous pattern
            // of fetching topics for context.
            // Actually, to make it robust, let's just fetch all topics for now.

            const { data } = await supabase
                .from('knowledge_nodes')
                .select('name, metadata')
                .eq('node_type', 'topic')
                .limit(1000);

            if (data) {
                setDynamicTopics(data.map((d: any) => ({
                    label: d.name,
                    value: d.name,
                    subject: d.metadata?.subject || 'Unknown',
                })));
            } else {
                setDynamicTopics([]);
            }
        };
        fetchDynamic();
    }, []);

    // State for user class
    const [userClass, setUserClass] = useState<'11' | '12' | 'Both'>('11');

    useEffect(() => {
        const loadUser = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                // Map legacy 'Reappear' -> 'Both'
                const cls = (user.user_metadata?.class as string) === 'Reappear' ? 'Both' : (user.user_metadata?.class || '11');
                setUserClass(cls as any);
            }
        };
        loadUser();
    }, []);

    // Filter Topics based on Subject & Class
    let filteredTopics = [
        ...(EXAM_TAXONOMY.find(e => e.value === selectedExam)?.topics || []),
        ...dynamicTopics
    ].filter(t => {
        if (!t.subject) return false;

        // Strict Filtering Logic
        if (userClass === '11' && t.class_level !== '11') return false;
        if (userClass === '12' && t.class_level !== '12') return false;
        // If 'Both', show everything

        // Normalize for comparison
        const tSub = t.subject.toLowerCase();
        const sSub = selectedSubject.toLowerCase();

        // Handle "Maths" vs "Mathematics"
        if (sSub.startsWith('math') && tSub.startsWith('math')) return true;
        return tSub === sSub;
    });

    // Deduplicate
    const uniqueMap = new Map();
    filteredTopics.forEach(t => uniqueMap.set(t.value, t));
    filteredTopics = Array.from(uniqueMap.values());
    filteredTopics.sort((a, b) => a.label.localeCompare(b.label));

    const router = useRouter();

    const handleStart = () => {
        if (!selectedExam || !selectedSubject) {
            Alert.alert('Incomplete Selection', 'Please select at least an exam and a subject to start.');
            return;
        }

        router.push({
            pathname: '/practice/session',
            params: {
                exam: selectedExam,
                subject: selectedSubject,
                topic: selectedTopic || 'mixed', // Default to mixed if no topic selected (though UI might force valid topic)
                // Actually, if we want topic to be optional (whole subject practice), we can do that.
                // But the UI shows "Select a Topic". Let's assume user MUST pick a topic for now, or if they don't, it implies 'mixed' for the whole subject?
                // The prompt said "Topic dropdown only populates...", implies selection. 
                // Let's coerce empty topic to 'mixed' which usually means "All topics in this subject/exam".
                subtopic: 'mixed', // HARDCODED as requested
                mode: 'practice'
            }
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const isReady = selectedExam && (selectedTopic || true); // Allow starting without topic? Let's assume yes (Mixed)

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Practice Arena</Text>
                <Text style={styles.headerSubtitle}>Configure your session</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Target Exam</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examList}>
                    {EXAMS.map(exam => {
                        const isSelected = selectedExam === exam;
                        return (
                            <TouchableOpacity
                                key={exam}
                                style={[styles.examChip, isSelected && styles.examChipSelected]}
                                onPress={() => setSelectedExam(exam)}
                            >
                                <Text style={[styles.examChipText, isSelected && styles.examChipTextSelected]}>
                                    {exam}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examList}>
                    {SUBJECTS.map(sub => {
                        const isSelected = selectedSubject === sub;
                        return (
                            <TouchableOpacity
                                key={sub}
                                style={[styles.examChip, isSelected && styles.examChipSelected]}
                                onPress={() => {
                                    setSelectedSubject(sub);
                                    setSelectedTopic('');
                                }}
                            >
                                <Text style={[styles.examChipText, isSelected && styles.examChipTextSelected]}>
                                    {sub}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Topic</Text>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowTopicPicker(!showTopicPicker)}
                >
                    <Text style={selectedTopic ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {filteredTopics.find(t => t.value === selectedTopic)?.label || "Select a Topic (Optional)"}
                    </Text>
                    <ChevronDown size={20} color={Colors.textDim} />
                </TouchableOpacity>

                {showTopicPicker && (
                    <View style={styles.pickerContainer}>
                        <TouchableOpacity
                            style={styles.pickerItem}
                            onPress={() => {
                                setSelectedTopic('');
                                setShowTopicPicker(false);
                            }}
                        >
                            <Text style={[styles.pickerItemText, { fontStyle: 'italic', opacity: 0.8 }]}>
                                Mixed (All Topics)
                            </Text>
                        </TouchableOpacity>
                        {filteredTopics.map(t => (
                            <TouchableOpacity
                                key={t.value}
                                style={styles.pickerItem}
                                onPress={() => {
                                    setSelectedTopic(t.value);
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

            {/* Subtopic Removed */}

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
