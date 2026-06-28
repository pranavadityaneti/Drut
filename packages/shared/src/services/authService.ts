import { getSupabase } from '../lib/supabase';
import { User } from '../types';
import type { AuthChangeEvent, Session, UserAttributes } from '@supabase/supabase-js';
import { log } from '../lib/log';


export const getCurrentUser = async (): Promise<User | null> => {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
};

export const login = async (email: string, password: string): Promise<{ user: User | null }> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user };
};

/**
 * Sign up a new user.
 *
 * Returns `sessionEstablished: true` when Supabase logged the user in
 * immediately (e.g., email confirmation disabled in project settings, or
 * a phone/social provider that auto-confirms). Returns `false` when the
 * user needs to verify their email before the session activates — in that
 * case, the caller should show a "check your email" screen instead of
 * routing the user into the app.
 */
export const signup = async (email: string, password: string): Promise<{ user: User | null; sessionEstablished: boolean }> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user, sessionEstablished: !!data.session };
};

/**
 * WEB Google sign-in. Redirects the browser to Google, then back to the current
 * origin; the session is parsed from the URL (detectSessionInUrl) and persisted
 * (localStorage). MOBILE uses its own native flow (expo-web-browser) — do NOT
 * call this on React Native (there's no window).
 */
export const loginWithGoogle = async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) throw new Error(error.message);
};

export const logout = async (): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
};

export const onAuthStateChange = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    const supabase = getSupabase();
    if (!supabase) {
        log.warn("Supabase not initialized, cannot listen for auth changes.");
        // Return a dummy subscription object that does nothing.
        return { data: { subscription: { unsubscribe: () => { } } } };
    }
    return supabase.auth.onAuthStateChange(callback);
};

export const updateUser = async (attributes: UserAttributes): Promise<{ user: User | null }> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error) throw new Error(error.message);
    return { user: data.user };
};

export const resetPasswordForEmail = async (email: string): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Redirect user back to the app after reset
    });
    if (error) throw new Error(error.message);
};