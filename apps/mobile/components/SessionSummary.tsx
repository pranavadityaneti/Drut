import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { CheckCircle, XCircle, Home, RotateCw, TrendingUp, AlertTriangle } from 'lucide-react-native';

interface SessionResult {
    isCorrect: boolean;
    timeTaken: number;
}

interface SessionSummaryProps {
    results: SessionResult[];
    totalQuestions: number;
    onExit: () => void;
    // onRestart?: () => void; // Future
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
    results,
    totalQuestions,
    onExit
}) => {
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Determine greeting based on accuracy
    let greeting = 'Good Effort';
    let iconColor = '#eab308'; // Yellow
    let IconComponent = TrendingUp;

    if (accuracy >= 80) {
        greeting = 'Mastery Achieved!';
        iconColor = '#22c55e'; // Green
        IconComponent = CheckCircle;
    } else if (accuracy >= 40) {
        greeting = 'Good Effort';
        iconColor = '#eab308'; // Yellow
        IconComponent = TrendingUp;
    } else {
        greeting = 'Needs Focus';
        iconColor = '#ef4444'; // Red
        IconComponent = AlertTriangle;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                    <IconComponent size={64} color={iconColor} />
                </View>

                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.subtext}>Session Complete</Text>

                {/* Search / Stats Block */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{accuracy}%</Text>
                        <Text style={styles.statLabel}>Accuracy</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{correctCount}/{totalQuestions}</Text>
                        <Text style={styles.statLabel}>Correct</Text>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.primaryButton} onPress={onExit}>
                        <Home size={20} color={Colors.white} />
                        <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
                    </TouchableOpacity>

                    {/* Placeholder for Retry - currently exit is safest */}
                    {/* 
                    <TouchableOpacity style={styles.secondaryButton} onPress={onExit}>
                        <RotateCw size={20} color={Colors.text} />
                        <Text style={styles.secondaryButtonText}>Practice Again</Text>
                    </TouchableOpacity> 
                    */}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 24,
        backgroundColor: '#f0fdf4',
        padding: 20,
        borderRadius: 50,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtext: {
        fontSize: 16,
        color: Colors.textDim,
        marginBottom: 32,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        justifyContent: 'space-around',
        marginBottom: 32,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: Colors.textDim,
    },
    divider: {
        width: 1,
        backgroundColor: '#e2e8f0',
    },
    actions: {
        width: '100%',
        gap: 16,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 8,
    },
    secondaryButtonText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '600',
    }
});
