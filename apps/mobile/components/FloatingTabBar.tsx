import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Zap, User, BookOpen } from 'lucide-react-native';

// Tab configuration
const TAB_CONFIG: Record<string, { icon: typeof Home; label: string }> = {
    dashboard: { icon: Home, label: 'Home' },
    practice: { icon: BookOpen, label: 'Practice' },
    sprint: { icon: Zap, label: 'Sprint' },
    profile: { icon: User, label: 'Profile' },
};

interface TabItemProps {
    routeName: string;
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
}

const TabItem = ({ routeName, isFocused, onPress, onLongPress }: TabItemProps) => {
    const config = TAB_CONFIG[routeName] || { icon: Home, label: routeName };
    const IconComponent = config.icon;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
                styles.tabItem,
                isFocused && styles.tabItemActive,
            ]}
        >
            <IconComponent
                size={22}
                color={isFocused ? '#FFFFFF' : '#666666'}
                strokeWidth={2}
            />
            {isFocused && (
                <Text style={styles.tabLabel}>
                    {config.label}
                </Text>
            )}
        </Pressable>
    );
};

export default function FloatingTabBar({
    state,
    descriptors,
    navigation,
}: BottomTabBarProps) {
    return (
        <View style={styles.container}>
            <View style={styles.tabBar}>
                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    return (
                        <TabItem
                            key={route.key}
                            routeName={route.name}
                            isFocused={isFocused}
                            onPress={onPress}
                            onLongPress={onLongPress}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 30,
        paddingVertical: 10,
        paddingHorizontal: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 25,
        backgroundColor: 'transparent',
    },
    tabItemActive: {
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 18,
    },
    tabLabel: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
});
