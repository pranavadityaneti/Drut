import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout } from '../../constants/Colors';
import { authService, EXAM_TAXONOMY, fetchChapterSources, getPrimaryBoardForExam, classMatchesSelection } from '@drut/shared';
import type { ChapterSource } from '@drut/shared';
// @ts-ignore
import { supabase } from '@drut/shared';
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'] as const;
const QUESTION_COUNTS = [5, 10, 20, 50] as const;
const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry'];

export default function PracticeScreen() {
    const router = useRouter();
    // Allow deep-linking from dashboard weak-topic cards: practice?presetSubject=Physics&presetChapter=Optics
    const { presetSubject, presetChapter } = useLocalSearchParams<{
        presetSubject?: string;
        presetChapter?: string;
    }>();

    // Allowed exams (filtered by user's target_exams) — initial state shows all,
    // gets narrowed in useEffect once user metadata loads.
    const [allowedExams, setAllowedExams] = useState<{ value: string; label: string }[]>(
        EXAM_TAXONOMY.map(e => ({ value: e.value, label: e.label }))
    );

    // selectedExamValue is the snake_case backend value ('ap_eapcet')
    // selectedExamLabel is the display value ('AP EAPCET')
    const [selectedExamValue, setSelectedExamValue] = useState<string>(EXAM_TAXONOMY[0]?.value || 'ap_eapcet');
    const [selectedSubject, setSelectedSubject] = useState<string>(
        // Honor preset subject if provided AND it's a known subject
        (presetSubject && SUBJECTS.includes(presetSubject)) ? presetSubject : SUBJECTS[0]
    );

    // Chapters (multi-select) — start with preset chapter if provided, else "all"
    const [selectedChapters, setSelectedChapters] = useState<string[]>(
        presetChapter ? [presetChapter] : ['all']
    );
    const [showChapterList, setShowChapterList] = useState(false);

    // Difficulty & Question Count
    const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('Medium');
    const [questionCount, setQuestionCount] = useState<number>(10);

    // Dynamic chapters from knowledge_nodes + taxonomy
    const [dynamicTopics, setDynamicTopics] = useState<any[]>([]);
    const [userClass, setUserClass] = useState<'11' | '12' | 'Both'>('Both');

    // Picker v2 state (see PracticeSetup.tsx for full notes).
    // Board is derived from exam (BIEAP/TSBIE/NCERT) — no Board pill.
    // Class supports "Both" for cross-class practice.
    // NCERT-include checkbox augments chapter list when state board is primary.
    const [chapterSources, setChapterSources] = useState<ChapterSource[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('Class 11');
    const [includeNcert, setIncludeNcert] = useState<boolean>(false);

    // Fetch chapter sources grouped by (board × class × subject) for current subject
    useEffect(() => {
        const loadSources = async () => {
            if (!selectedSubject) {
                setChapterSources([]);
                return;
            }
            const sources = await fetchChapterSources(selectedSubject);
            setChapterSources(sources);

            // Also populate the legacy dynamicTopics shape so the multi-select
            // chapter list below keeps working when no Board/Class is picked yet.
            const flat = sources.flatMap(s => s.chapters.map(c => ({
                label: c.name,
                value: c.name,
                subject: s.subject,
                class_level: s.class_name === 'Class 11' || s.class_name === '1st Year' ? '11' : '12',
            })));
            setDynamicTopics(flat);
        };
        loadSources();
    }, [selectedSubject]);

    // Get user class + restrict exam picker to user's enrolled exams
    useEffect(() => {
        const loadUser = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                const cls = (user.user_metadata?.class as string) === 'Reappear' ? 'Both' : (user.user_metadata?.class || 'Both');
                setUserClass(cls as any);

                // Narrow the exam picker to user's enrolled exams.
                // If user has none set (legacy/test accounts), show all.
                const userTargets: string[] = Array.isArray(user.user_metadata?.target_exams)
                    ? user.user_metadata.target_exams
                    : [];
                const fallbackPrimary = user.user_metadata?.exam_profile;
                const targets = userTargets.length > 0
                    ? userTargets
                    : (fallbackPrimary ? [fallbackPrimary] : []);

                if (targets.length > 0) {
                    const allowed = EXAM_TAXONOMY
                        .filter(e => targets.includes(e.value))
                        .map(e => ({ value: e.value, label: e.label }));
                    if (allowed.length > 0) {
                        setAllowedExams(allowed);
                        // Snap selected exam to first allowed if current is not allowed
                        setSelectedExamValue(prev =>
                            allowed.some(a => a.value === prev) ? prev : allowed[0].value
                        );
                    }
                }
            }
        };
        loadUser();
    }, []);

    // Picker v2 derivation — see PracticeSetup.tsx for full notes
    const primaryBoard = useMemo(() => getPrimaryBoardForExam(selectedExamValue), [selectedExamValue]);
    const primaryHasContent = useMemo(() => chapterSources.some(s => s.board === primaryBoard), [chapterSources, primaryBoard]);
    const effectivePrimaryBoard = primaryHasContent ? primaryBoard : 'NCERT';
    const stateBoardFellBack = primaryBoard !== 'NCERT' && !primaryHasContent;
    const effectiveBoards = useMemo(() => {
        const set = new Set<string>([effectivePrimaryBoard]);
        if (includeNcert && effectivePrimaryBoard !== 'NCERT') set.add('NCERT');
        return Array.from(set);
    }, [effectivePrimaryBoard, includeNcert]);

    interface DisplayChapter { id: string; name: string; label: string; board: string; classNameOfSource: string; }
    const displayedChapters: DisplayChapter[] = useMemo(() => chapterSources
        .filter(s => effectiveBoards.includes(s.board))
        .filter(s => classMatchesSelection(s.class_name, selectedClass))
        .flatMap(s => s.chapters.map(c => ({
            id: c.id,
            name: c.name,
            label: (selectedClass === 'Both' || includeNcert)
                ? `${c.name} (${s.class_name}${effectiveBoards.length > 1 ? `, ${s.board}` : ''})`
                : c.name,
            board: s.board,
            classNameOfSource: s.class_name,
        })))
        .sort((a, b) => a.label.localeCompare(b.label)), [chapterSources, effectiveBoards, selectedClass, includeNcert]);

    // Filter chapters — picker v2 uses displayedChapters (already class+board
    // filtered + labeled). Fall back to flat taxonomy+dynamic filter for legacy
    // cases (non-EAPCET exams with no knowledge_nodes data).
    const filteredChapters = useMemo(() => {
        if (displayedChapters.length > 0) {
            return displayedChapters.map(c => ({ label: c.label, value: c.name }));
        }

        // Legacy fallback (no chapter sources)
        const taxonomyTopics = EXAM_TAXONOMY.find(e => e.value === selectedExamValue)?.topics || [];
        const combined = [...taxonomyTopics, ...dynamicTopics];
        const filtered = combined.filter(t => {
            if (!t.subject) return false;
            if (userClass === '11' && t.class_level && t.class_level !== '11') return false;
            if (userClass === '12' && t.class_level && t.class_level !== '12') return false;
            const tSub = t.subject.toLowerCase();
            const sSub = selectedSubject.toLowerCase();
            if (sSub.startsWith('math') && tSub.startsWith('math')) return true;
            return tSub === sSub;
        });
        const uniqueMap = new Map();
        filtered.forEach(t => uniqueMap.set(t.value, t));
        return Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [displayedChapters, selectedExamValue, selectedSubject, dynamicTopics, userClass]);

    // Reset chapters when subject changes
    useEffect(() => {
        setSelectedChapters(['all']);
        setShowChapterList(false);
    }, [selectedSubject]);

    const toggleChapter = (chapterValue: string) => {
        if (chapterValue === 'all') {
            setSelectedChapters(['all']);
            return;
        }

        setSelectedChapters(prev => {
            const withoutAll = prev.filter(c => c !== 'all');
            if (withoutAll.includes(chapterValue)) {
                const updated = withoutAll.filter(c => c !== chapterValue);
                return updated.length === 0 ? ['all'] : updated;
            } else {
                return [...withoutAll, chapterValue];
            }
        });
    };

    const isAllSelected = selectedChapters.includes('all');
    const chapterLabel = isAllSelected
        ? 'All chapters'
        : selectedChapters.length === 1
            ? selectedChapters[0]
            : `${selectedChapters.length} chapters selected`;

    const handleStart = () => {
        if (!selectedExamValue || !selectedSubject) {
            Alert.alert('Incomplete', 'Please select an exam and subject.');
            return;
        }

        router.push({
            pathname: '/practice/session',
            params: {
                // Pass the snake_case value (e.g., 'ap_eapcet'), NOT the display label.
                // Backend cached_questions.exam_profile column stores values, not labels.
                exam: selectedExamValue,
                subject: selectedSubject,
                chapters: JSON.stringify(isAllSelected ? ['all'] : selectedChapters),
                difficulty: difficulty,
                questionCount: String(questionCount),
                mode: 'practice',
                // Board derived from picked chapter's source (picker v2).
                // For multi-chapter selections, use the first picked chapter's board
                // (mixed-board selection is intentionally simplified to the first
                // pick; advanced UX could surface this as a warning later).
                board: (() => {
                    const picked = selectedChapters.find(ch => ch !== 'all');
                    const meta = displayedChapters.find(c => c.name === picked);
                    return meta?.board || effectivePrimaryBoard;
                })(),
            },
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.step}>Step 1 of 2</Text>
                    <Text style={styles.headerTitle}>Configure Practice</Text>
                    <Text style={styles.headerSubtitle}>Pick your subject, chapters, and difficulty</Text>
                </View>

                {/* Exam Selector (restricted to user's enrolled exams) */}
                <View style={styles.section}>
                    <Text style={styles.label}>Target Exam</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                        {allowedExams.map(exam => (
                            <TouchableOpacity
                                key={exam.value}
                                style={[styles.chip, selectedExamValue === exam.value && styles.chipSelected]}
                                onPress={() => setSelectedExamValue(exam.value)}
                            >
                                <Text style={[styles.chipText, selectedExamValue === exam.value && styles.chipTextSelected]}>
                                    {exam.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Subject Selector */}
                <View style={styles.section}>
                    <Text style={styles.label}>Subject</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                        {SUBJECTS.map(sub => (
                            <TouchableOpacity
                                key={sub}
                                style={[styles.chip, selectedSubject === sub && styles.chipSelected]}
                                onPress={() => setSelectedSubject(sub)}
                            >
                                <Text style={[styles.chipText, selectedSubject === sub && styles.chipTextSelected]}>
                                    {sub}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Class pills (Class 11 / Class 12 / Both — picker v2) */}
                {chapterSources.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Class</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                            {(['Class 11', 'Class 12', 'Both'] as const).map(cls => (
                                <TouchableOpacity
                                    key={cls}
                                    style={[styles.chip, selectedClass === cls && styles.chipSelected]}
                                    onPress={() => { setSelectedClass(cls); setSelectedChapters(['all']); }}
                                >
                                    <Text style={[styles.chipText, selectedClass === cls && styles.chipTextSelected]}>
                                        {cls}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* NCERT-include checkbox (hidden when primary board is already NCERT) */}
                {chapterSources.length > 0 && effectivePrimaryBoard !== 'NCERT' && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                            onPress={() => { setIncludeNcert(!includeNcert); setSelectedChapters(['all']); }}
                        >
                            <View style={[styles.checkbox, includeNcert && styles.checkboxChecked]}>
                                {includeNcert && <Check size={14} color={Colors.white} />}
                            </View>
                            <Text style={{ color: Colors.text, fontSize: 14, flex: 1 }}>
                                Also practice NCERT national-level questions for extra rigor
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Source footnote */}
                {chapterSources.length > 0 && (
                    <View style={styles.section}>
                        <Text style={{ fontSize: 11, color: Colors.textDim, fontStyle: 'italic' }}>
                            {stateBoardFellBack
                                ? `Showing NCERT questions — your state board (${primaryBoard}) doesn't have ${selectedSubject} textbooks loaded yet.`
                                : `Source: ${effectiveBoards.join(' + ')} ${effectivePrimaryBoard === 'NCERT' ? '(national curriculum)' : '(your state board)'}`}
                        </Text>
                    </View>
                )}

                {/* Chapter Selector (Multi-select, filtered to selected board × class × subject) */}
                <View style={styles.section}>
                    <Text style={styles.label}>Chapters</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowChapterList(!showChapterList)}
                    >
                        <Text style={isAllSelected ? styles.dropdownPlaceholder : styles.dropdownText}>
                            {chapterLabel}
                        </Text>
                        {showChapterList
                            ? <ChevronUp size={20} color={Colors.textDim} />
                            : <ChevronDown size={20} color={Colors.textDim} />
                        }
                    </TouchableOpacity>

                    {showChapterList && (
                        <View style={styles.chapterList}>
                            {/* All Chapters toggle */}
                            <TouchableOpacity
                                style={styles.chapterItem}
                                onPress={() => toggleChapter('all')}
                            >
                                <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
                                    {isAllSelected && <Check size={14} color={Colors.white} />}
                                </View>
                                <Text style={[styles.chapterItemText, { fontWeight: '700' }]}>
                                    All chapters
                                </Text>
                            </TouchableOpacity>

                            {filteredChapters.map(ch => {
                                const isSelected = !isAllSelected && selectedChapters.includes(ch.value);
                                return (
                                    <TouchableOpacity
                                        key={ch.value}
                                        style={styles.chapterItem}
                                        onPress={() => toggleChapter(ch.value)}
                                    >
                                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                                            {isSelected && <Check size={14} color={Colors.white} />}
                                        </View>
                                        <Text style={styles.chapterItemText}>{ch.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {filteredChapters.length === 0 && (
                                <Text style={styles.emptyText}>No chapters found for this subject</Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Difficulty Selector */}
                <View style={styles.section}>
                    <Text style={styles.label}>Difficulty</Text>
                    <View style={styles.difficultyRow}>
                        {DIFFICULTIES.map(level => {
                            const isSelected = difficulty === level;
                            const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                                Easy: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
                                Medium: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
                                Hard: { bg: '#fff1f2', border: '#f43f5e', text: '#be123c' },
                                Mixed: { bg: '#f0f9ff', border: '#3b82f6', text: '#1d4ed8' },
                            };
                            const colors = colorMap[level];

                            return (
                                <TouchableOpacity
                                    key={level}
                                    style={[
                                        styles.difficultyButton,
                                        isSelected && { backgroundColor: colors.bg, borderColor: colors.border },
                                    ]}
                                    onPress={() => setDifficulty(level)}
                                >
                                    <Text style={[
                                        styles.difficultyText,
                                        isSelected && { color: colors.text },
                                    ]}>
                                        {level}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Question Count */}
                <View style={styles.section}>
                    <Text style={styles.label}>Questions</Text>
                    <View style={styles.countRow}>
                        {QUESTION_COUNTS.map(n => (
                            <TouchableOpacity
                                key={n}
                                style={[styles.countPill, questionCount === n && styles.countPillSelected]}
                                onPress={() => setQuestionCount(n)}
                            >
                                <Text style={[styles.countText, questionCount === n && styles.countTextSelected]}>
                                    {n}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Start Button */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                        <Text style={styles.startButtonText}>Start Practice</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        padding: 20,
        paddingTop: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    step: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 15,
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
    chipRow: {
        gap: 12,
        paddingRight: 20,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: Colors.white,
    },
    chipSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#eef2ff',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim,
    },
    chipTextSelected: {
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
    chapterList: {
        marginTop: 8,
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 4,
        maxHeight: 280,
    },
    chapterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#d1d5db',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chapterItemText: {
        fontSize: 15,
        color: Colors.text,
        flex: 1,
    },
    emptyText: {
        padding: 16,
        color: Colors.textDim,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    difficultyRow: {
        flexDirection: 'row',
        gap: 10,
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
    difficultyText: {
        fontWeight: '600',
        color: Colors.textDim,
        fontSize: 14,
    },
    countRow: {
        flexDirection: 'row',
        gap: 12,
    },
    countPill: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: Colors.white,
    },
    countPillSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#ebf9e3',
    },
    countText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textDim,
    },
    countTextSelected: {
        color: Colors.primary,
    },
    footer: {
        padding: 20,
        marginTop: 12,
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
    startButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
