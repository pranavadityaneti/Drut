/**
 * Google sign-in wrapper.
 *
 * Uses @react-native-google-signin/google-signin to obtain an idToken from
 * Google, then hands it to Supabase via signInWithIdToken so the user
 * lands in the same `auth.users` row as everyone else (no separate
 * Google-only user table).
 *
 * SETUP CHECKLIST (one-time, in Google Cloud + Supabase + Drut configs):
 *
 *   1. Google Cloud Console (https://console.cloud.google.com):
 *      a. Create / pick a project for Drut.
 *      b. APIs & Services → OAuth consent screen → fill in "Drut", logo,
 *         support email, scopes: openid + email + profile.
 *      c. APIs & Services → Credentials → "Create credentials" → OAuth client ID:
 *         - WEB application:
 *             Authorized redirect URI:
 *               https://ukrtaerwaxekonislnpw.supabase.co/auth/v1/callback
 *             Copy the "Client ID" — this is `WEB_CLIENT_ID` below.
 *         - iOS application (bundle id: club.drut.mobile or whatever app.json says):
 *             Copy "Client ID" — this is `IOS_CLIENT_ID` below.
 *         - Android application (SHA-1 fingerprint from your keystore):
 *             No client ID needed in the lib — it uses the SHA-1 + package name
 *             to resolve the right OAuth client at runtime.
 *
 *   2. Supabase Dashboard → Authentication → Providers → Google:
 *      - Enable.
 *      - Paste `WEB_CLIENT_ID` as the "Client ID".
 *      - Paste the corresponding "Client Secret" from Google Cloud.
 *      - Save.
 *
 *   3. apps/mobile/app.json:
 *      - Add `expoUsername` (already there) + iOS bundle identifier
 *        matching the iOS OAuth client.
 *      - Add the google-signin plugin block (see app.json).
 *
 *   4. Native rebuild required:
 *      - This lib has native code, so `expo prebuild` / EAS build cycle
 *        must run before the button works on a real device. Expo Go does
 *        NOT include this module.
 *
 *   5. Fill in the IDs in EXPO_PUBLIC_GOOGLE_* env vars (read below).
 *      The library reads from constants — NOT from .env at runtime —
 *      so we read these from process.env at module load time and pass
 *      them to GoogleSignin.configure().
 */

import { Platform } from 'react-native';
import { getSupabase, log } from '@drut/shared';

// Env vars — set in apps/mobile/.env (or EAS secrets for production builds).
// EXPO_PUBLIC_ prefix means they're inlined into the JS bundle.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

let configured = false;
let GoogleSigninRef: any = null;

function loadGoogleSignin() {
    if (GoogleSigninRef) return GoogleSigninRef;
    try {
        // Lazy require so Expo Go (which lacks the native module) doesn't crash
        // at app start. The require will throw inside the call site if missing;
        // we catch and surface a clear error.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        GoogleSigninRef = require('@react-native-google-signin/google-signin');
        return GoogleSigninRef;
    } catch (err) {
        throw new Error(
            'Google sign-in native module not available. This requires a custom dev build (Expo Go does not include it). Run `npx expo prebuild && npx expo run:ios|android`.',
        );
    }
}

export function isGoogleSignInConfigured(): boolean {
    return Boolean(WEB_CLIENT_ID);
}

function configureOnce() {
    if (configured) return;
    if (!isGoogleSignInConfigured()) {
        throw new Error(
            'Google sign-in not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID for iOS) in apps/mobile/.env.',
        );
    }
    const { GoogleSignin } = loadGoogleSignin();
    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        iosClientId: IOS_CLIENT_ID || undefined,
        offlineAccess: false,
        scopes: ['openid', 'email', 'profile'],
    });
    configured = true;
}

export interface GoogleSignInResult {
    success: true;
    email: string;
    fullName: string | null;
}

/**
 * Open the Google sign-in sheet, get an idToken, exchange it with Supabase.
 * On success, the supabase client is now authenticated — caller should
 * navigate to the post-login destination (dashboard or profile-setup).
 *
 * On failure, throws an Error with a user-readable message.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
    configureOnce();
    const { GoogleSignin, statusCodes } = loadGoogleSignin();

    try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (err: any) {
        if (Platform.OS === 'android') {
            throw new Error('Google Play Services unavailable on this device.');
        }
        // iOS: hasPlayServices is a no-op, ignore.
    }

    let userInfo: any;
    try {
        userInfo = await GoogleSignin.signIn();
    } catch (err: any) {
        if (err?.code === statusCodes?.SIGN_IN_CANCELLED) {
            throw new Error('Cancelled');
        }
        if (err?.code === statusCodes?.IN_PROGRESS) {
            throw new Error('Google sign-in already in progress.');
        }
        log.error('[googleAuth] GoogleSignin.signIn failed', err);
        throw new Error(err?.message || 'Google sign-in failed.');
    }

    const idToken = userInfo?.idToken || userInfo?.data?.idToken;
    if (!idToken) {
        throw new Error('Google did not return an idToken.');
    }

    const supabase = getSupabase();
    const { error: supaErr } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
    });
    if (supaErr) {
        log.error('[googleAuth] supabase.signInWithIdToken failed', supaErr);
        throw new Error(supaErr.message || 'Could not sign in with Google.');
    }

    const profile = userInfo?.user || userInfo?.data?.user || {};
    return {
        success:  true,
        email:    profile.email || '',
        fullName: profile.name || null,
    };
}
