import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.5?bundle';

const supabaseUrl = 'https://ukrtaerwaxekonislnpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8';

let supabaseClient: SupabaseClient | null = null;

// Initialize the client as a singleton in the browser.
if (typeof window !== "undefined") {
    if (supabaseUrl && supabaseAnonKey) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
}

/**
 * Returns the singleton instance of the Supabase client.
 * This is fail-soft and will return null if the client could not be initialized.
 */
export function getSupabase() {
  if (!supabaseClient) {
      console.warn("[Supabase] Supabase client is not initialized. This may be expected in some environments or if credentials are missing.");
  }
  return supabaseClient;
}
