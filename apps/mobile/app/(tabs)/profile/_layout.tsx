import { Stack } from 'expo-router';

export default function ProfileLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="account-settings" />
            <Stack.Screen name="exam-preferences" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="help-support" />
            <Stack.Screen name="about" />
        </Stack>
    );
}
