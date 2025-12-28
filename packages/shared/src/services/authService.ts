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

export const signup = async (email: string, password: string): Promise<{ user: User | null }> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user };
};

export const loginWithGoogle = async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client is not available.");
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
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