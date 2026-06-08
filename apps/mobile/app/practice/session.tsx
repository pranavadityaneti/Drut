import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SessionEngine } from '../../components/SessionEngine';
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

    // Ensure we have required config
    if (!params.exam || !params.subject) {
        return null;
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
            <SessionEngine
                config={{
                    exam: params.exam,
                    subject: params.subject,
                    chapters,
                    difficulty: (params.difficulty as any) || 'Medium',
                    questionCount: params.questionCount ? parseInt(params.questionCount, 10) : 10,
                    mode: (params.mode as 'practice' | 'sprint') || 'practice',
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
});
