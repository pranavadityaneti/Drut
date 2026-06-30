/**
 * Reports and analytics — placeholder for the detailed page.
 *
 * The full surface (Overview + Subject mastery rings + 30-day accuracy chart +
 * Sprint history + Focus areas) is queued as Slice B; this is the Slice A landing
 * so the Profile row routes to a real screen, not a broken link.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, BarChart3 } from 'lucide-react-native';
import { Colors } from '../../../constants/Colors';

export default function ReportsScreen() {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reports and analytics</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.body}>
                <View style={styles.iconWrap}>
                    <BarChart3 size={36} color="#16261a" />
                </View>
                <Text style={styles.title}>Detailed reports are on the way</Text>
                <Text style={styles.sub}>
                    Subject mastery rings, accuracy over time, Sprint history, and focus
                    areas — all in one place. Your home screen already shows the headline
                    metrics; we're building the deep view next.
                </Text>
            </ScrollView>
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
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
    body: { padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
    iconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#eaf6dd',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 40, marginBottom: 18,
    },
    title: {
        fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center', letterSpacing: -0.3,
    },
    sub: {
        fontSize: 14, color: Colors.textDim, marginTop: 10, textAlign: 'center',
        lineHeight: 22, maxWidth: 320,
    },
});
