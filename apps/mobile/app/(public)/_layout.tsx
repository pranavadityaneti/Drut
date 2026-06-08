import { Stack } from 'expo-router';

export default function PublicLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="phone-login" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="profile-setup" />
        </Stack>
    );
}
