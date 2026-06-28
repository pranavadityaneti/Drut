import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { ArrowLeft, GraduationCap, Building2, Calendar, Check } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useProfileSetup } from '../../../contexts/ProfileSetupContext';
import { getExamOptions, normalizeTargetExams } from '@drut/shared';

type YearOption = '11' | '12' | 'Reappear';

const YEAR_OPTIONS: { value: YearOption; label: string }[] = [
    { value: '11', label: 'Class 11' },
    { value: '12', label: 'Class 12' },
    { value: 'Reappear', label: 'Reappear' },
];

// All supported exams (AP EAPCET, TG EAPCET, JEE Main) — MULTI-select. Same source
// (EXAM_TAXONOMY) as web, so both platforms offer the identical set.
const EXAM_OPTIONS = getExamOptions();

const YEAR_DROPDOWN: { value: string; label: string }[] = [
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
    { value: '2028', label: '2028' },
    { value: 'unknown', label: 'Not sure yet' },
];

export default function AcademicScreen() {
    const router = useRouter();
    const { data, updateFields } = useProfileSetup();

    const [yearInSchool, setYearInSchool] = useState<YearOption | null>(
        (data.year_in_school as YearOption) || null
    );
    const [practiceBoth, setPracticeBoth] = useState<boolean>(
        data.practice_scope === 'class_11_and_12'
    );
    const [targetExams, setTargetExams] = useState<string[]>(() => normalizeTargetExams(data.target_exams));
    const toggleExam = (v: string) =>
        setTargetExams(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
    const [examYear, setExamYear] = useState<string>(data.target_exam_year || '');
    const [school, setSchool] = useState<string>(data.school_name || '');
    const [coaching, setCoaching] = useState<string>(data.coaching_center || '');

    useEffect(() => {
        if (data.year_in_school && !yearInSchool) setYearInSchool(data.year_in_school as YearOption);
    }, [data]);

    const handleNext = () => {
        if (!yearInSchool) {
            Alert.alert('Required', 'Please select your year in school.');
            return;
        }
        if (targetExams.length === 0) {
            Alert.alert('Required', 'Please select at least one target exam.');
            return;
        }
        if (!examYear) {
            Alert.alert('Required', 'Please select your target exam year.');
            return;
        }
        if (!school.trim() || school.trim().length < 2) {
            Alert.alert('Required', 'Please enter your school name.');
            return;
        }

        // Derive practice_scope from year + toggle
        let practiceScope: 'class_11' | 'class_11_and_12';
        if (yearInSchool === '11') {
            practiceScope = practiceBoth ? 'class_11_and_12' : 'class_11';
        } else {
            // Class 12 and Reappear always get both
            practiceScope = 'class_11_and_12';
        }

        updateFields({
            year_in_school: yearInSchool,
            practice_scope: practiceScope,
            target_exams: targetExams,
            target_exam_year: examYear,
            school_name: school.trim(),
            coaching_center: coaching.trim() || undefined,
        });

        router.push('/(public)/profile-setup/referral');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <ArrowLeft color={Colors.text} size={24} />
                        </TouchableOpacity>
                        <View style={styles.progressDots}>
                            <View style={[styles.dot, styles.dotActive]} />
                            <View style={[styles.dot, styles.dotActive]} />
                            <View style={styles.dot} />
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Your exam prep 📚</Text>
                        <Text style={styles.subtitle}>Tell us about your EAPCET journey.</Text>
                    </View>

                    {/* Year in school */}
                    <View style={styles.section}>
                        <Text style={styles.label}>What year are you in? *</Text>
                        <View style={styles.segmentedRow}>
                            {YEAR_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.segmentButton,
                                        yearInSchool === opt.value && styles.segmentButtonActive,
                                    ]}
                                    onPress={() => setYearInSchool(opt.value)}
                                >
                                    <Text
                                        style={[
                                            styles.segmentButtonText,
                                            yearInSchool === opt.value && styles.segmentButtonTextActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Conditional toggle for Class 11 */}
                        {yearInSchool === '11' && (
                            <TouchableOpacity
                                style={styles.toggleCard}
                                onPress={() => setPracticeBoth(!practiceBoth)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, practiceBoth && styles.checkboxChecked]}>
                                    {practiceBoth && <Check size={14} color={Colors.white} strokeWidth={3} />}
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.toggleTitle}>
                                        Also practice Class 12 content
                                    </Text>
                                    <Text style={styles.toggleSubtitle}>
                                        Recommended if you want to study ahead
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Target Exam(s) — multi-select */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Target Exam(s) *</Text>
                        <Text style={styles.hint}>Select all that apply — EAPCET students often also take JEE Main.</Text>
                        <View style={styles.segmentedRow}>
                            {EXAM_OPTIONS.map(opt => {
                                const selected = targetExams.includes(opt.value);
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[styles.segmentButton, selected && styles.segmentButtonActive]}
                                        onPress={() => toggleExam(opt.value)}
                                    >
                                        <Text style={[styles.segmentButtonText, selected && styles.segmentButtonTextActive]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Exam Year */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Target Exam Year *</Text>
                        <View style={styles.yearGrid}>
                            {YEAR_DROPDOWN.map(opt => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.yearChip,
                                        examYear === opt.value && styles.yearChipActive,
                                    ]}
                                    onPress={() => setExamYear(opt.value)}
                                >
                                    <Text
                                        style={[
                                            styles.yearChipText,
                                            examYear === opt.value && styles.yearChipTextActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* School */}
                    <View style={styles.section}>
                        <Text style={styles.label}>School Name *</Text>
                        <View style={styles.inputContainer}>
                            <GraduationCap size={20} color={Colors.textDim} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Your school name"
                                placeholderTextColor={Colors.textDim}
                                value={school}
                                onChangeText={setSchool}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* Coaching */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Coaching Center</Text>
                        <View style={styles.inputContainer}>
                            <Building2 size={20} color={Colors.textDim} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Optional"
                                placeholderTextColor={Colors.textDim}
                                value={coaching}
                                onChangeText={setCoaching}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* Continue button */}
                    <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 24,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.border,
    },
    dotActive: {
        backgroundColor: Colors.primary,
        width: 32,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textDim,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 10,
    },
    hint: {
        fontSize: 12,
        color: Colors.textDim,
        marginTop: -4,
        marginBottom: 10,
    },
    segmentedRow: {
        flexDirection: 'row',
        gap: 8,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    segmentButtonActive: {
        borderColor: Colors.primary,
        backgroundColor: '#ebf9e3',
    },
    segmentButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim,
    },
    segmentButtonTextActive: {
        color: Colors.primary,
    },
    toggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        marginTop: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    toggleTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    toggleSubtitle: {
        fontSize: 12,
        color: Colors.textDim,
        marginTop: 2,
    },
    yearGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    yearChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
    },
    yearChipActive: {
        borderColor: Colors.primary,
        backgroundColor: '#ebf9e3',
    },
    yearChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim,
    },
    yearChipTextActive: {
        color: Colors.primary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
        backgroundColor: Colors.white,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
    },
    continueButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
});
