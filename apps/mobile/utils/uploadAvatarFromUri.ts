import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { profileService } from '@drut/shared';

/**
 * Upload a local image URI (from expo-image-picker) to Supabase storage.
 *
 * React Native cannot construct File or Blob from local URIs reliably, so we
 * read the file as base64, decode it to ArrayBuffer, and pass that to the
 * shared upload service.
 *
 * Returns the public URL of the uploaded avatar.
 */
export async function uploadAvatarFromUri(uri: string): Promise<string> {
    // Get file info for size
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
        throw new Error('Selected image file does not exist.');
    }

    // Detect mime type from extension
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    // Decode to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload via shared service.
    //
    // profileService.uploadAvatar's signature today expects a browser File.
    // React Native can't construct File reliably from a local URI, so we
    // pass an ArrayBuffer-backed shape that the underlying Supabase storage
    // client accepts at runtime. Cast away the type mismatch for now;
    // forlater item will widen the signature properly in the Cat 5 shared
    // service consolidation.
    return profileService.uploadAvatar({
        data: arrayBuffer,
        name: `avatar.${ext}`,
        type: mimeType,
        size: fileInfo.size || arrayBuffer.byteLength,
    } as any);
}
