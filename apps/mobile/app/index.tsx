import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

export default function Index() {
    const { user, loading, isAuthenticated } = useAuth();

    // Still checking session — show splash/spinner
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Not logged in → intro carousel + auth
    if (!isAuthenticated) {
        return <Redirect href="/(public)/onboarding" />;
    }

    // Logged in but hasn't completed profile setup → wizard
    if (!user?.user_metadata?.onboarding_completed) {
        return <Redirect href="/(public)/profile-setup/welcome" />;
    }

    // Fully authenticated + onboarded → dashboard
    return <Redirect href="/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
});
