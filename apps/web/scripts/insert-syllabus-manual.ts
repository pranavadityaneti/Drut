
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ukrtaerwaxekonislnpw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcnRhZXJ3YXhla29uaXNsbnB3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2NDI5NywiZXhwIjoyMDc4MzQwMjk3fQ.nDiqRGHUm-zBEFM-eeHbzQGPsfo3e-yxSnVDGuy1j1k";

if (!supabaseKey) {
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY env var");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dataToInsert = [
    {
        subject: 'Chemistry',
        searchText: 'Che_2nd_year_part_-1', // 2nd Year Part 1 (Assuming main text or Vol 1)
        chapters: [
            "Solid State",
            "Solutions",
            "Electrochemistry and Chemical Kinetics",
            "Surface Chemistry",
            "General Principles of Metallurgy",
            "p-Block Elements",
            "d and f Block Elements & Coordination Compounds",
            "Polymers",
            "Biomolecules",
            "Chemistry in Everyday Life",
            "Haloalkanes and Haloarenes",
            "Organic Compounds Containing C, H and O",
            "Organic Compounds Containing Nitrogen"
        ]
    }
];

async function main() {
    for (const item of dataToInsert) {
        console.log(`Processing ${item.subject}...`);

        // 1. Find Textbook
        const { data: textbooks, error: tbError } = await supabase
            .from('textbooks')
            .select('id, file_path, subject')
            .ilike('file_path', `%${item.searchText}%`);

        if (tbError) {
            console.error(`Error searching textbook:`, tbError);
            continue;
        }

        if (!textbooks || textbooks.length === 0) {
            console.error(`No textbook found matching ${item.searchText}`);
            continue;
        }

        console.log(`Found ${textbooks.length} textbooks matching ${item.searchText}. Using the first one: ${textbooks[0].file_path}`);
        const textbook = textbooks[0];

        // 2. Prepare Nodes
        const nodes = item.chapters.map((chap, idx) => ({
            name: `Unit ${idx + 1}: ${chap}`,
            node_type: 'topic',
            metadata: {
                textbook_id: textbook.id,
                subject: textbook.subject, // Use DB subject
                is_chapter: true,
                manual_entry: true
            }
        }));

        // 3. Insert
        const { error: insertError } = await supabase
            .from('knowledge_nodes')
            .insert(nodes);

        if (insertError) {
            console.error(`Error inserting nodes for ${item.subject}:`, insertError);
        } else {
            console.log(`✅ Successfully inserted ${nodes.length} chapters for ${item.subject}`);
        }
    }
}

main();
