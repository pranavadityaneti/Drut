
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import fs from 'fs';
// @ts-ignore
import { Buffer } from 'buffer';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse'); // v1.1.1 standard

const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
// Hardcoded Key provided by user
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";

if (!SUPABASE_KEY) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is missing.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    console.log("🚀 Starting Local Syllabus Ingestion...");


    // 1. List Textbooks
    const { data: textbooks, error } = await supabase
        .from('textbooks')
        .select('id, title, file_path');

    if (error) {
        console.error("Failed to list textbooks:", error);
        return;
    }

    console.log(`Found ${textbooks.length} textbooks.`);

    // 2. Process Each
    for (const tb of textbooks) {
        console.log(`\n-----------------------------------------`);
        console.log(`Processing: ${tb.title} (${tb.file_path})`);

        try {
            // A. Download
            console.log(`   Downloading...`);
            const { data: blob, error: dlError } = await supabase.storage
                .from('textbooks')
                .download(tb.file_path);

            if (dlError) throw dlError;

            // B. Parse PDF locally
            console.log(`   Parsing PDF...`);
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Standard Usage for v1.1.1
            const data = await pdf(buffer);

            // C. Extract Start Text (TOC Context)
            const fullText = data.text;
            const textContext = fullText.slice(0, 60000); // Increased to 60k to skip abundant front matter
            console.log(`   Extracted ${fullText.length} chars (sending ${textContext.length})`);

            // DEBUG: Save text to inspect
            if (fullText.length > 0) {
                fs.writeFileSync(`debug_text_${tb.id}.txt`, textContext);
                console.log(`   [DEBUG] Saved text sample to debug_text_${tb.id}.txt`);
            }

            // D. Call Edge Function (Syllabus Extraction ONLY)
            console.log(`   Invoking AI Extraction...`);
            const { data: funcData, error: funcError } = await supabase.functions.invoke('ingest-textbook', {
                body: {
                    filePath: tb.file_path,
                    textContent: textContext, // <--- SENDING TEXT DIRECTLY
                    skipChunking: true,       // <--- SKIP HEAVY LIFTING
                    skipExtraction: false
                }
            });

            if (funcError) {
                console.error(`   ❌ Function Call Error:`, funcError);
            } else {
                console.log(`   ✅ Success! Response:`, JSON.stringify(funcData, null, 2));
            }

        } catch (err: any) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }
    console.log("\n✅ Batch Processing Complete.");
}

run();
