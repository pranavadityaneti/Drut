import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import FloatingTabBar from '../../components/FloatingTabBar';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <FloatingTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen name="dashboard" />
            <Tabs.Screen name="practice" />
            <Tabs.Screen name="sprint" />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
}

