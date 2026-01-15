
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Hardcoded Key for convenience (Internal Tool)
const SUPABASE_URL = "https://ukrtaerwaxekonislnpw.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('Starting Chapter Name Cleanup...');

    // 1. Fetch relevant nodes (topics)
    // We only care about topics that might have these prefixes.
    // We can fetch all 'topic' nodes.
    const { data: nodes, error } = await supabase
        .from('knowledge_nodes')
        .select('id, name')
        .eq('node_type', 'topic');

    if (error) {
        console.error('Error fetching nodes:', error);
        process.exit(1);
    }

    console.log(`Scanning ${nodes.length} nodes...`);

    let updatedCount = 0;

    for (const node of nodes) {
        const oldName = node.name;
        // Regex to match:
        // "Unit 1", "Unit 10", "Chapter 1", "Chapter 12"
        // Followed by optional separator ( : - . ) and whitespace
        // Also "Appendix-I", "Appendix"

        let newName = oldName
            .replace(/^(Unit|Chapter)\s+\d+\s*[:\-.]?\s*/i, '') // Remove "Unit 1: ", "Chapter 5- "
            .replace(/^Appendix[-\s\w]*[:\-.]?\s*/i, '') // Remove "Appendix-I : ", "Appendix"
            .trim();

        if (newName !== oldName) {
            console.log(`Cleaning: "${oldName}" -> "${newName}"`);

            const { error: updateError } = await supabase
                .from('knowledge_nodes')
                .update({ name: newName })
                .eq('id', node.id);

            if (updateError) {
                console.error(`Failed to update ${node.id}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`Cleanup Complete. Updated ${updatedCount} nodes.`);
}

main();
