
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Hardcoded Key (Internal Tool)
const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('Verifying Content Chunks...');

    // 1. Find Textbooks of interest
    const searchTerms = ['Physics', 'Che_'];
    const { data: textbooks, error: tbError } = await supabase
        .from('textbooks')
        .select('id, file_path, subject')
        .or(`file_path.ilike.%Physics%,file_path.ilike.%Che_%`);

    if (tbError) {
        console.error('Error fetching textbooks:', tbError);
        process.exit(1);
    }

    console.log(`Found ${textbooks.length} Textbooks. Checking chunks...`);

    for (const tb of textbooks) {
        // Count chunks via select (limit 1 to check existence or count all if needed)
        // Check if ANY exist first (faster)
        const { data, count, error } = await supabase
            .from('textbook_chunks')
            .select('id', { count: 'exact' })
            .eq('textbook_id', tb.id)
            .limit(1);

        if (error) {
            console.error(`Error counting chunks for ${tb.file_path}:`, error);
        } else {
            // Count might still be valid even with limit? 
            // Yes, Supabase returns total count if 'exact' requested.
            const total = count ?? 0;
            const extra = total === 0 ? "⚠️ NO DATA (RAG Will Fail)" : "✅ Ready";
            console.log(`[${tb.subject}] ${tb.file_path}: ${total} chunks. ${extra}`);
        }
    }
}

main();
