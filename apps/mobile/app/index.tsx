import { Redirect } from 'expo-router';

export default function Index() {
    // TODO: Check auth state here
    // For now, redirect to Onboarding
    return <Redirect href="/(public)/onboarding" />;
}
