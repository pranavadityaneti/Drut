
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log("--- CHECKING SYLLABUS DATA ---");

    // 1. Check Metadata of existing knowledge_nodes
    const { data, error } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .limit(10);

    if (error) {
        console.error("Error reading DB:", error);
    } else {
        console.log(`Found ${data.length} rows.`);
        console.log("Sample Data:", JSON.stringify(data, null, 2));
    }
}

checkData();
