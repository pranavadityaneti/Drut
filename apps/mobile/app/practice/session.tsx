import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionEngine } from '../../components/SessionEngine';
import { Colors } from '../../constants/Colors';

export default function SessionScreen() {
    const params = useLocalSearchParams<{
        exam: string;
        subject: string;
        topic?: string;
        mode?: string;
    }>();

    // Ensure we have config
    if (!params.exam || !params.subject) {
        return null; // Or Redirect back
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
            <SessionEngine
                config={{
                    exam: params.exam,
                    subject: params.subject,
                    topic: params.topic,
                    mode: params.mode as 'practice' | 'sprint',
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    }
});
