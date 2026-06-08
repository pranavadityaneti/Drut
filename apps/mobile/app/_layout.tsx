import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ProfileSetupProvider } from '../contexts/ProfileSetupContext';
import { log } from '@drut/shared';
import { useEffect } from 'react';

export default function RootLayout() {
    useEffect(() => {
        log.info('[Mobile] RootLayout mounted');
    }, []);

    return (
        <AuthProvider>
            <ProfileSetupProvider>
                <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(public)" />
                        <Stack.Screen name="(tabs)" />
                    </Stack>
                    <StatusBar style="dark" />
                </SafeAreaProvider>
            </ProfileSetupProvider>
        </AuthProvider>
    );
}
