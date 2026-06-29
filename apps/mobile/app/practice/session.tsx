import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SessionEngine } from '../../components/SessionEngine';
import { SprintEngine } from '../../components/SprintEngine';
import { Colors } from '../../constants/Colors';

export default function SessionScreen() {
    const params = useLocalSearchParams<{
        exam: string;
        subject: string;
        chapters?: string;
        difficulty?: string;
        questionCount?: string;
        mode?: string;
    }>();
    const router = useRouter();

    // Ensure we have required config — show a clear message instead of a silent blank
    // screen (e.g. when deep-linked or navigated here without exam/subject params).
    if (!params.exam || !params.subject) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
                <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
                <Text style={{ fontSize: 16, color: Colors.text, textAlign: 'center', marginBottom: 16 }}>
                    This practice session is missing its exam or subject. Head back and pick a chapter to start.
                </Text>
                <TouchableOpacity
                    onPress={() => router.replace('/(tabs)/practice')}
                    style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
                >
                    <Text style={{ color: Colors.white, fontWeight: '700' }}>Back to practice</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Parse chapters from JSON string
    let chapters: string[] = ['all'];
    try {
        if (params.chapters) {
            chapters = JSON.parse(params.chapters);
        }
    } catch {
        chapters = ['all'];
    }

    const mode = (params.mode as 'practice' | 'sprint') || 'practice';
    const config = {
        exam: params.exam,
        subject: params.subject,
        chapters,
        difficulty: (params.difficulty as any) || 'Medium',
        questionCount: params.questionCount ? parseInt(params.questionCount, 10) : 10,
        mode,
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
            {mode === 'sprint'
                ? <SprintEngine config={config} />
                : <SessionEngine config={config} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
});
