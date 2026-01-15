
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import fs from 'fs';
// @ts-ignore
import { Buffer } from 'buffer';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// Hardcoded Key (Internal Tool) - Corrected
const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";

if (!SUPABASE_KEY) {
    console.error("❌ Key missing");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("🚀 Starting Manual Content Ingestion (Chemistry Only)...");

    // 1. Find Textbooks (Chemistry)
    const { data: textbooks, error } = await supabase
        .from('textbooks')
        .select('id, title, file_path')
        .ilike('file_path', '%Che_%'); // Filter Chemistry

    if (error) {
        console.error("Failed to list textbooks:", error);
        return;
    }

    console.log(`Found ${textbooks.length} Chemistry textbooks.`);

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
            const data = await pdf(buffer);

            const fullText = data.text;
            console.log(`   Extracted ${fullText.length} chars.`);

            if (fullText.length === 0) {
                console.warn("   ⚠️ Empty text extracted. Skipping.");
                continue;
            }

            // C. Call Edge Function (Content Chunking ONLY)
            // skipExtraction: true (Don't run AI Syllabus)
            // skipChunking: false (Do run Chunking)
            console.log(`   Invoking Ingestion (Content Only)...`);
            const { data: funcData, error: funcError } = await supabase.functions.invoke('ingest-textbook', {
                body: {
                    filePath: tb.file_path,
                    textContent: fullText, // Send full text!
                    skipChunking: false,
                    skipExtraction: true
                }
            });

            if (funcError) {
                console.error(`   ❌ Function Call Error:`, funcError);
            } else {
                console.log(`   ✅ Success! Chunks processed.`);
                // console.log(JSON.stringify(funcData, null, 2));
            }

        } catch (err: any) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }
    console.log("\n✅ processing Complete.");
}

run();
