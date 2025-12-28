import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Layout } from '../../constants/Colors';
// import { BrainCircuit, Target, Zap, ChevronRight, Check } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Master Your Weakness',
        description: 'Our AI pinpoints exactly what you don’t know and helps you fix it fast.',
        // icon: <Target size={80} color={Colors.primary} />,
        color: '#ebf9e3', // Light green bg
    },
    {
        id: '2',
        title: 'Sprint to Success',
        description: 'Short, intense practice sessions designed to boost your stamina and speed.',
        // icon: <Zap size={80} color={Colors.primary} />,
        color: '#f0fdf4',
    },
    {
        id: '3',
        title: 'Exam Ready',
        description: 'Simulate real exam conditions and track your readiness in real-time.',
        // icon: <BrainCircuit size={80} color={Colors.primary} />,
        color: '#ecfccb', // Lime tint
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideIndex = Math.ceil(event.nativeEvent.contentOffset.x / width);
        if (slideIndex !== currentIndex) {
            setCurrentIndex(slideIndex);
        }
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            router.replace('/(public)/login');
        }
    };

    const handleSkip = () => {
        router.replace('/(public)/login');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Top Skip Button */}
            <SafeAreaView>
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </SafeAreaView>

            {/* Carousel */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>
                        <View style={[styles.imageContainer, { backgroundColor: item.color }]}>
                            {/* {item.icon} */}
                            <Text>Icon</Text>
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.description}>{item.description}</Text>
                        </View>
                    </View>
                )}
            />

            {/* Footer Controls */}
            <View style={styles.footer}>
                {/* Indicators */}
                <View style={styles.indicatorContainer}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                currentIndex === index ? styles.activeIndicator : styles.inactiveIndicator,
                            ]}
                        />
                    ))}
                </View>

                {/* Next Button */}
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>
                        {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                    {/* {currentIndex === SLIDES.length - 1 ? (
                        <Check size={20} color={Colors.white} style={{ marginLeft: 8 }} />
                    ) : (
                        <ChevronRight size={20} color={Colors.white} style={{ marginLeft: 8 }} />
                    )} */}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    skipButton: {
        alignSelf: 'flex-end',
        padding: 20,
        zIndex: 10,
    },
    skipText: {
        fontSize: 16,
        color: Colors.textDim,
        fontWeight: '600',
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    imageContainer: {
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: 40, // Large rounded corners
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
        fontFamily: 'System', // Use system font for now
    },
    description: {
        fontSize: 16,
        color: Colors.textDim,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        height: 120,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
    },
    indicatorContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
    },
    activeIndicator: {
        width: 24,
        backgroundColor: Colors.primary,
    },
    inactiveIndicator: {
        width: 8,
        backgroundColor: '#E0E0E0',
    },
    nextButton: {
        backgroundColor: Colors.text, // Black button like reference
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextButtonText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
