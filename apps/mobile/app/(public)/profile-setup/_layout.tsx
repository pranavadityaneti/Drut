import { Stack } from 'expo-router';

export default function ProfileSetupLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: false, // prevent swipe-back (force users through the wizard)
            }}
        >
            <Stack.Screen name="welcome" />
            <Stack.Screen name="about-you" />
            <Stack.Screen name="academic" />
            <Stack.Screen name="referral" />
            <Stack.Screen name="celebration" />
        </Stack>
    );
}
