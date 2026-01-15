
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Hardcoded Key (Internal Tool)
const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('🔍 Starting Physics Content Audit...');

    // 1. Get Physics Textbook ID
    const { data: textbooks, error: tbError } = await supabase
        .from('textbooks')
        .select('id, title, file_path')
        .ilike('file_path', '%Physics%');

    if (tbError || !textbooks || textbooks.length === 0) {
        console.error('❌ No Physics Textbooks found:', tbError);
        return;
    }

    console.log(`📚 Found ${textbooks.length} Physics Textbooks.`);

    // 2. Audit Chunks for each
    for (const tb of textbooks) {
        console.log(`\n--------------------------------------------------`);
        console.log(`📘 Textbook: ${tb.title} (${tb.file_path})`);

        const { data: chunks, error: chunkError } = await supabase
            .from('textbook_chunks')
            .select('content, chunk_index')
            .eq('textbook_id', tb.id)
            .limit(5);

        if (chunkError) {
            console.error('   ❌ Error fetching chunks:', chunkError);
            continue;
        }

        if (!chunks || chunks.length === 0) {
            console.log('   ⚠️ NO CHUNKS FOUND (RAG Missing)');
        } else {
            console.log(`   ✅ Chunks Exist. Showing 5 random samples:\n`);
            chunks.forEach((chunk, i) => {
                const preview = chunk.content.replace(/\n/g, ' ').substring(0, 150);
                console.log(`   [Chunk #${chunk.chunk_index}] "${preview}..."`);
            });
        }
    }
}

main();
