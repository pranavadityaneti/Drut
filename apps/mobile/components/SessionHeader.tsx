import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Layout } from '../constants/Colors';
import { ChevronDown, Clock, StopCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SessionHeaderProps {
    currentIndex: number;
    totalQuestions: number;
    topic?: string;
    difficulty?: string;
    questionTime?: string;
    sessionTime?: string;
    onExit: () => void;
    onToggleDifficulty?: () => void; // Future hook
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
    currentIndex,
    totalQuestions,
    questionTime,
    sessionTime,
    onExit,
    topic,
    difficulty,
    onToggleDifficulty
}) => {
    const insets = useSafeAreaInsets();
    // Option B: Left Finish, Center Topic+Diff, Right Stacked Timers

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.content}>

                {/* Left: Finish Button */}
                <TouchableOpacity
                    onPress={onExit}
                    style={styles.finishButton}
                >
                    {/* <StopCircle size={18} color={Colors.error} /> */}
                    <Text style={styles.finishText}>Finish</Text>
                </TouchableOpacity>

                {/* Center: Topic & Difficulty */}
                <TouchableOpacity
                    style={styles.centerSection}
                    onPress={onToggleDifficulty}
                    activeOpacity={0.7}
                >
                    <Text style={styles.topicText} numberOfLines={1}>
                        {topic || 'Practice'}
                    </Text>
                    {/* Visual cue for Dropdown */}
                    <View style={styles.difficultyBadge}>
                        <Text style={styles.difficultyText}>{difficulty || 'Standard'}</Text>
                        <ChevronDown size={12} color={Colors.primary} />
                    </View>
                </TouchableOpacity>

                {/* Right: Stacked Timers */}
                <View style={styles.timerSection}>
                    <View style={styles.questionTimer}>
                        <Clock size={12} color={Colors.text} />
                        <Text style={styles.timerMain}>{questionTime || "0:00"}</Text>
                    </View>
                    <Text style={styles.timerSub}>Total: {sessionTime || "0:00"}</Text>
                </View>

            </View>

            {/* Progress / Question Counter Sub-header */}
            <View style={styles.subHeader}>
                <Text style={styles.questionCounter}>Question {currentIndex + 1}</Text>
                {/* Could add a thin progress bar here if needed, keeping it clean for now */}
            </View>
            <View style={styles.divider} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.white,
        zIndex: 10,
    },
    content: {
        height: 56, // Standard navbar height
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Layout.spacing.m,
    },
    finishButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    finishText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textDim
    },
    centerSection: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 12,
        gap: 2
    },
    topicText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center'
    },
    difficultyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2
    },
    difficultyText: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600'
    },
    timerSection: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 50,
    },
    questionTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    timerMain: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        fontVariant: ['tabular-nums']
    },
    timerSub: {
        fontSize: 11,
        color: Colors.textDim,
        marginTop: 1,
        fontVariant: ['tabular-nums']
    },
    subHeader: {
        paddingHorizontal: Layout.spacing.m,
        paddingBottom: 8,
    },
    questionCounter: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textDim,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        width: '100%'
    }
});
