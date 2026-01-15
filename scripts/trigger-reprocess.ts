
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env') });

const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjQyOTcsImV4cCI6MjA3ODM0MDI5N30.kSp_OfqOl9F3cfXRp9W_-HfQ4eO9tFKt3kBbU6yvxv8";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function triggerReprocess() {
    console.log("--- TRIGGERING SYLLABUS EXTRACTION ---");

    const filesToTry = [
        "Andhra_Pradesh_Intermediate_Maths-_IA.pdf",
        "Andhra_Pradesh_Intermediate_Physics-I.pdf",
        "Che_1st_year_part_-1.pdf"
    ];

    console.log(`Attempting to trigger for ${filesToTry.length} potential files...`);

    for (const filePath of filesToTry) {
        console.log(`Triggering for: ${filePath}`);

        const { data, error } = await supabase.functions.invoke('ingest-textbook', {
            body: {
                filePath,
                skipExtraction: false
            }
        });

        if (error) console.error(`Failed for ${filePath}:`, error);
        else console.log(`Success for ${filePath}:`, data);
    }
}

triggerReprocess();
