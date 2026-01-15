
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ukrtaerwaxekonislnpw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";
const supabase = createClient(supabaseUrl, supabaseKey);

const physicsChapters = [
    "Waves",
    "Ray Optics and Optical Instruments",
    "Wave Optics",
    "Electric Charges and Fields",
    "Electrostatic Potential and Capacitance",
    "Current Electricity",
    "Moving Charges and Magnetism",
    "Magnetism and Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Dual Nature of Radiation and Matter",
    "Atoms",
    "Nuclei",
    "Semiconductor Electronics: Materials, Devices and Simple Circuits",
    "Communication Systems"
];

async function main() {
    // 1. Find the Corrupted Textbook (Che 1st year)
    const { data: textbooks } = await supabase
        .from('textbooks')
        .select('id, file_path')
        .ilike('file_path', '%Che_1st_year_part_-1%');

    if (!textbooks || textbooks.length === 0) {
        console.log("No Chemistry textbook found to clean.");
        return;
    }

    const tbId = textbooks[0].id;
    console.log(`Cleaning Corruption in Textbook: ${textbooks[0].file_path} (${tbId})`);

    // 2. Delete Physics Chapters from it
    for (const chap of physicsChapters) {
        const { error } = await supabase
            .from('knowledge_nodes')
            .delete()
            .contains('metadata', { textbook_id: tbId }) // Correct JSONB filter
            .ilike('name', `%${chap}%`);

        if (error) console.error(`Failed to delete ${chap}:`, error);
        else console.log(`Deleted potential corruption: ${chap}`);
    }
}

main();
