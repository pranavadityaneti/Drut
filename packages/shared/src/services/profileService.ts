import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

const AVATARS_BUCKET = 'avatars';

// User profile interface for mobile app
export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    customerId: string;
}

/**
 * Get the current user's profile from Supabase auth
 */
export async function getProfile(): Promise<UserProfile | null> {
    const supabase = getSupabase();
    if (!supabase) {
        log.error('[profileService] Supabase client not available.');
        return null;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            log.error('[profileService] Error getting user:', error?.message);
            return null;
        }

        // Generate a customer ID from the user's UUID (first 8 characters, uppercase)
        const customerId = `DRT-${user.id.substring(0, 8).toUpperCase()}`;

        return {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
            phone: user.user_metadata?.phone || user.phone || null,
            avatarUrl: user.user_metadata?.avatar_url || null,
            customerId,
        };
    } catch (err) {
        log.error('[profileService] Exception getting profile:', err);
        return null;
    }
}

/**
 * Update user profile metadata (name and phone)
 */
export async function updateProfile(updates: {
    fullName?: string;
    phone?: string;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
        return { success: false, error: 'Supabase client not available' };
    }

    try {
        const updateData: Record<string, any> = {};
        if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
        if (updates.phone !== undefined) updateData.phone = updates.phone;

        const { error } = await supabase.auth.updateUser({
            data: updateData,
        });

        if (error) {
            log.error('[profileService] Error updating profile:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        log.error('[profileService] Exception updating profile:', err);
        return { success: false, error: err.message };
    }
}

export const uploadAvatar = async (file: File): Promise<string> => {
    const supabase = getSupabase();
    if (!supabase) {
        log.error('[profile] Supabase client not available.');
        throw new Error("Service not available.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        log.error('[profile] not authenticated');
        throw new Error("User not authenticated");
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
        throw new Error("File size must be less than 1MB");
    }

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        throw new Error("Only PNG and JPG images are allowed");
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
        log.error('[profile] avatar upload failed', uploadError);

        // Provide helpful error messages based on error type
        if (uploadError.message === 'Bucket not found' || uploadError.message.includes('not found')) {
            throw new Error(
                "Could not upload avatar. The 'avatars' storage bucket needs to be created in Supabase. " +
                "Please go to Supabase Dashboard → Storage → Create bucket named 'avatars' (public)."
            );
        }

        if (uploadError.message.includes('policy')) {
            throw new Error(
                "Upload permission denied. Please check that storage policies allow authenticated users to upload avatars."
            );
        }

        // Generic error
        throw new Error(`Could not upload avatar: ${uploadError.message}`);
    }

    const { data } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(filePath);

    // Add a timestamp to bust the browser cache on update
    return `${data.publicUrl}?t=${new Date().getTime()}`;
};

export const updateOnboardingProfile = async (
    userId: string,
    data: {
        full_name: string;
        class: '11' | '12' | 'Reappear';
        target_exams: string[];
    }
): Promise<void> => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not initialized");

    // 1. Update user_metadata in auth.users
    const { error: authError } = await supabase.auth.updateUser({
        data: {
            full_name: data.full_name,
            class: data.class,
            target_exams: data.target_exams,
            onboarding_completed: true,
            // Map first target to exam_profile (e.g., 'JEE Main' -> 'jee_main')
            // This ensures dashboard taxonomy works based on primary choice
            exam_profile: data.target_exams[0]?.toLowerCase().replace(/\s+/g, '_') || 'jee_main'
        }
    });

    if (authError) {
        log.error('[profile] Failed to update auth metadata', authError);
        throw authError;
    }

    // 2. Update public.user_profiles table
    const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: userId,
            full_name: data.full_name,
            class: data.class,
            exam_profile: data.target_exams[0]?.toLowerCase().replace(/\s+/g, '_') || 'jee_main',
            // Note: If safety_net_exams isn't in DB schema yet, we might need to rely on metadata
            // or add it to the table. For now, we assume user_profiles handles basic info
            // and auth metadata holds the rest.
        }, { onConflict: 'user_id' });

    if (dbError) {
        // Log but don't fail hard if it's just a sync issue, as auth metadata is primary for this flow
        log.warn('[profile] Failed to sync user_profiles table', dbError);
    }
};