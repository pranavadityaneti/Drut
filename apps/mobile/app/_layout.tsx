import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { log } from '@drut/shared';
import { useEffect } from 'react';
import { View, Text } from 'react-native';

export default function RootLayout() {
    useEffect(() => {
        log.info('[Mobile] RootLayout mounted');
    }, []);

    return (
        <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(public)" />
                <Stack.Screen name="(tabs)" />
            </Stack>
            <StatusBar style="dark" />
        </SafeAreaProvider>
    );
}
