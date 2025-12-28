import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

export default function AboutScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About</Text>
                <View style={styles.placeholder} />
            </View>
            <View style={styles.content}>
                <Text style={styles.appName}>Drut</Text>
                <Text style={styles.version}>Version 1.0.0</Text>
                <Text style={styles.tagline}>Master your exams with AI-powered practice</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
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
    headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
    placeholder: { width: 40 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    appName: { fontSize: 32, fontWeight: 'bold', color: Colors.primary, marginBottom: 8 },
    version: { fontSize: 14, color: Colors.textDim, marginBottom: 16 },
    tagline: { fontSize: 16, color: Colors.text, textAlign: 'center', paddingHorizontal: 40 },
});
