import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// --- IMPORTANT ---
// NOTE: Switched to Local LAN IP for Simulator Testing
// const SUPABASE_URL: string = "http://172.20.10.5:54321";
// const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkrRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";
const SUPABASE_URL: string = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";


/**
 * Initialize the Supabase client. Idempotent — subsequent calls return the
 * already-initialized client (the first call wins).
 *
 * Web: not required to call. The lazy `supabase` proxy below initializes
 *   with web defaults (no session persistence, no URL session detection).
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

  const useStorage = !!config?.storage;
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 2 } },
      auth: {
        storage: config?.storage,
        // When a storage adapter is provided (mobile), persist sessions and
        // auto-refresh tokens so users stay logged in across app restarts.
        // Web keeps the conservative defaults to avoid localStorage access errors.
        persistSession: useStorage,
        detectSessionInUrl: !useStorage,
        autoRefreshToken: useStorage,
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