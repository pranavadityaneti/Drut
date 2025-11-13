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

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
        log.error('[profile] avatar upload failed', uploadError);
        // The user-facing error message from Supabase storage can be cryptic.
        // We can check for a common setup issue and provide a more helpful message.
        if (uploadError.message === 'Bucket not found') {
             throw new Error("Could not upload avatar. The 'avatars' storage bucket is missing. Please check the setup instructions in README.md.");
        }
        throw new Error("Could not upload avatar.");
    }

    const { data } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(filePath);

    // Add a timestamp to bust the browser cache on update
    return `${data.publicUrl}?t=${new Date().getTime()}`;
};