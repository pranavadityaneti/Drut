import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, GraduationCap, Building2 } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';
import { authService, getExamOptions, normalizeTargetExams } from '@drut/shared';

type YearOption = '11' | '12' | 'Reappear';

const YEAR_OPTIONS: { value: YearOption; label: string }[] = [
    { value: '11', label: 'Class 11' },
    { value: '12', label: 'Class 12' },
    { value: 'Reappear', label: 'Reappear' },
];

// All supported exams (AP EAPCET, TG EAPCET, JEE Main) — MULTI-select, same source as web.
const EXAM_OPTIONS = getExamOptions();

const YEAR_DROPDOWN = [
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
    { value: '2028', label: '2028' },
    { value: 'unknown', label: 'Not sure yet' },
];

export default function ExamPreferencesScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [yearInSchool, setYearInSchool] = useState<YearOption | null>(null);
    const [practiceBoth, setPracticeBoth] = useState<boolean>(false);
    const [targetExams, setTargetExams] = useState<string[]>([]);
    const toggleExam = (v: string) =>
        setTargetExams(prev => (prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]));
    const [examYear, setExamYear] = useState<string>('');
    const [school, setSchool] = useState<string>('');
    const [coaching, setCoaching] = useState<string>('');

    useEffect(() => {
        const load = async () => {
            const user = await authService.getCurrentUser();
            if (user) {
                const m = user.user_metadata || {};
                setYearInSchool((m.year_in_school as YearOption) || (m.class as YearOption) || '12');
                setPracticeBoth(m.practice_scope === 'class_11_and_12');

                setTargetExams(normalizeTargetExams(
                    Array.isArray(m.target_exams) && m.target_exams.length ? m.target_exams : m.exam_profile
                ));

                setExamYear(m.target_exam_year || '');
                setSchool(m.school_name || '');
                setCoaching(m.coaching_center || '');
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
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
        if (!school.trim()) {
            Alert.alert('Required', 'Please enter your school name.');
            return;
        }

        // Derive practice_scope
        let practiceScope: 'class_11' | 'class_11_and_12';
        if (yearInSchool === '11') {
            practiceScope = practiceBoth ? 'class_11_and_12' : 'class_11';
        } else {
            practiceScope = 'class_11_and_12';
        }

        setSaving(true);
        try {
            await authService.updateUser({
                data: {
                    year_in_school: yearInSchool,
                    class: yearInSchool, // backward compat
                    practice_scope: practiceScope,
                    target_exams: targetExams,
                    exam_profile: targetExams[0], // backward compat (primary exam)
                    target_exam_year: examYear,
                    school_name: school.trim(),
                    coaching_center: coaching.trim() || null,
                },
            });
            Alert.alert('Saved', 'Your exam preferences have been updated.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not save preferences.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Exam Preferences</Text>
                    <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <Check size={24} color={Colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Year in school */}
                    <View style={styles.section}>
                        <Text style={styles.label}>What year are you in?</Text>
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
                        <Text style={styles.label}>Target Exam(s)</Text>
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
                        <Text style={styles.label}>Target Exam Year</Text>
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
                        <Text style={styles.label}>School Name</Text>
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
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: { padding: 8 },
    saveButton: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
    scrollContent: { padding: 24 },
    section: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10 },
    hint: { fontSize: 12, color: Colors.textDim, marginTop: -4, marginBottom: 10 },
    segmentedRow: { flexDirection: 'row', gap: 8 },
    segmentButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    segmentButtonActive: { borderColor: Colors.primary, backgroundColor: '#ebf9e3' },
    segmentButtonText: { fontSize: 14, fontWeight: '600', color: Colors.textDim },
    segmentButtonTextActive: { color: Colors.primary },
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
    checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    toggleTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
    toggleSubtitle: { fontSize: 12, color: Colors.textDim, marginTop: 2 },
    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    yearChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.white,
    },
    yearChipActive: { borderColor: Colors.primary, backgroundColor: '#ebf9e3' },
    yearChipText: { fontSize: 14, fontWeight: '600', color: Colors.textDim },
    yearChipTextActive: { color: Colors.primary },
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
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: Colors.text },
});
