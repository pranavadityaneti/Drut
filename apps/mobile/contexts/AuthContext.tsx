import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSupabase, authService } from '@drut/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@drut/shared';

// Initialize Supabase with AsyncStorage BEFORE any auth calls
initSupabase({ storage: AsyncStorage });

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAuthenticated: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const checkSession = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
            } catch (err) {
                console.warn('[AuthProvider] Session check failed:', err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = authService.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}
