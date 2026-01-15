
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Try to load .env from apps/web (since shared might not have it or it might be in root)
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env') });
const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
// Using ANON KEY (Correct one from .env output)
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";

console.log(`Connecting to URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listTextbooks() {
    console.log("--- AUTHENTICATING ---");
    const email = `test.user.${Date.now()}@gmail.com`;
    const password = "TempPassword123!";

    // 1. Sign Up/In
    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        console.error("Auth Failed:", authError.message);
        // Try sign in if exists
        const { data: { user: user2 }, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) {
            console.error("Login Failed:", loginErr.message);
            return;
        }
    }
    console.log("Authenticated successfully.");

    // 2. List Files
    console.log("\n[1] Checking 'textbooks'...");
    const { data: tb, error: e2 } = await supabase.from('textbooks').select('*');
    if (e2) console.error("Error TB:", e2);
    else {
        console.log(`Found ${tb?.length || 0} textbooks.`);
        tb?.forEach(t => console.log(` - [${t.subject}] ${t.title}`));
    }

    console.log("\n[2] Checking 'knowledge_nodes'...");
    const { data: kn, error: e3 } = await supabase.from('knowledge_nodes').select('name');
    if (e3) console.error("Error KN:", e3);
    else {
        console.log(`Found ${kn?.length || 0} nodes.`);
        kn?.forEach(n => console.log(` - Node: ${n.name}`));
    }

    console.log("\n[3] Checking Storage Bucket 'textbooks'...");
    const { data: files, error: e4 } = await supabase.storage.from('textbooks').list();
    if (e4) console.error("Error Storage:", e4);
    else {
        console.log(`Found ${files?.length || 0} files in bucket.`);
        files?.forEach(f => console.log(` - File: ${f.name}`));
    }
}

listTextbooks();
