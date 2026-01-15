import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// --- IMPORTANT ---
// Please replace the placeholder values below with your actual Supabase credentials.
//
// 1. Go to your Supabase project dashboard.
// 2. Navigate to Project Settings > API.
// 3. Find your Project URL and anon Public key.
// 4. Paste them as strings into the variables below.
//
// NOTE: For a production application, these keys should be managed securely
// and not be hardcoded.
// NOTE: Switched to Local LAN IP for Simulator Testing
// const SUPABASE_URL: string = "http://172.20.10.5:54321";
// const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkrRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8"; 
const SUPABASE_URL: string = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";


export function getSupabase(): SupabaseClient {
  if (client) return client;

  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 2 } },
      auth: {
        persistSession: false,      // Disable localStorage to avoid storage access errors
        detectSessionInUrl: false,  // Don't parse session from URL
        autoRefreshToken: false     // No auto-refresh needed for anon key
      },
    });
  } catch (error) {
    // This provides a more helpful message for the specific "Invalid URL" error.
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new TypeError(`The Supabase URL provided ("${SUPABASE_URL}") is not a valid URL. Please check for typos and ensure it follows the format: https://<your-project-ref>.supabase.co`);
    }
    // Re-throw any other unexpected errors.
    throw error;
  }

  return client;
}

export const supabase = getSupabase();