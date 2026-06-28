import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// --- IMPORTANT ---
// NOTE: Switched to Local LAN IP for Simulator Testing
// const SUPABASE_URL: string = "http://172.20.10.5:54321";
// const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkrRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";
const SUPABASE_URL: string = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";


/**
 * Return window.localStorage ONLY if it is actually usable. Accessing it can
 * throw in privacy modes / sandboxed iframes / disabled-storage settings, so we
 * probe with a write+remove and fall back to undefined (in-memory) on any error.
 */
function safeBrowserStorage(): Storage | undefined {
  try {
    const ls = window.localStorage;
    const probe = '__drut_ls_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return undefined;
  }
}

/**
 * Initialize the Supabase client. Idempotent — subsequent calls return the
 * already-initialized client (the first call wins).
 *
 * Web: not required to call — the lazy `supabase` proxy below initializes on
 *   first use. The web client persists the session in localStorage (so users
 *   stay logged in across reloads) and parses the OAuth redirect hash.
 *
 * Mobile (React Native): MUST be called from the app entry point BEFORE any
 *   consumer touches the supabase client. Pass `{ storage: AsyncStorage }`
 *   so Supabase persists the session to native storage (otherwise users
 *   lose their session on every app restart). The AuthContext.tsx in the
 *   mobile app handles this — make sure AuthContext loads first.
 *
 *   Example (mobile):
 *     import AsyncStorage from '@react-native-async-storage/async-storage';
 *     initSupabase({ storage: AsyncStorage });
 */
export function initSupabase(config?: { storage?: any }): SupabaseClient {
  if (client) return client;

  // Mobile passes a React Native storage adapter (AsyncStorage). Web passes
  // nothing — but a browser SPA must STILL persist the session in localStorage
  // so users aren't logged out on every reload (previously persistSession was
  // false on web, which logged users out after one page). localStorage is probed
  // safely so locked-down browsers degrade to in-memory instead of throwing.
  const rnStorage = config?.storage;
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const browserStorage = (!rnStorage && isBrowser) ? safeBrowserStorage() : undefined;
  const storage = rnStorage ?? browserStorage;
  const canPersist = !!storage;

  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 2 } },
      auth: {
        storage,
        // Persist + auto-refresh whenever we have a working storage adapter
        // (AsyncStorage on mobile, localStorage on web). Without one (SSR / Node /
        // storage-blocked browser) we stay in-memory so nothing crashes.
        persistSession: canPersist,
        autoRefreshToken: canPersist,
        // Parse the OAuth redirect hash on web; harmless/false on React Native.
        detectSessionInUrl: isBrowser,
      },
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new TypeError(`The Supabase URL provided ("${SUPABASE_URL}") is not a valid URL. Please check for typos and ensure it follows the format: https://<your-project-ref>.supabase.co`);
    }
    throw error;
  }

  return client;
}

/**
 * Get the Supabase client. Initializes with web defaults if `initSupabase`
 * hasn't been called yet.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  return initSupabase();
}

/**
 * Lazy proxy — `import { supabase }` works as a normal property accessor,
 * but the underlying client isn't constructed until first property access.
 * This avoids the import-order race on mobile where AuthContext needs to
 * call `initSupabase({ storage: AsyncStorage })` before the client exists.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get: (_, prop) => (getSupabase() as any)[prop],
});