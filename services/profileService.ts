import { getSupabase } from '../lib/supabase';
import { log } from '../lib/log';

const AVATARS_BUCKET = 'avatars';

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