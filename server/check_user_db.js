
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserDb() {
    const email = 'thumardhyey36@gmail.com';
    console.log(`Checking databases for ${email}...`);

    // 1. Get User ID
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError || !profiles) {
        console.error('User not found:', profileError?.message);
        return;
    }

    const userId = profiles.id;
    console.log('User ID:', userId);

    // 2. Check databases
    const { data: dbs, error: dbError } = await supabase
        .from('user_databases')
        .select('*')
        .eq('user_id', userId);

    if (dbError) {
        console.error('Error fetching databases:', dbError.message);
        return;
    }

    console.log(`User has ${dbs.length} databases.`);
    dbs.forEach(db => console.log(` - ${db.name} (${db.id})`));

    // 3. If no databases, create default one
    if (dbs.length === 0) {
        console.log('Creating default database...');
        const { data: newDb, error: createError } = await supabase
            .from('user_databases')
            .insert([{
                user_id: userId,
                name: 'Default Study Plan',
                description: 'Auto-generated from 785 topics',
                icon: '📚'
            }])
            .select()
            .single();

        if (createError) {
            console.error('Error creating database:', createError.message);
            return;
        }

        console.log('Database created:', newDb.id);

        // 4. Initialize topics
        console.log('Initializing topics...');
        // We can call the initialize endpoint or just run the logic here.
        // Let's call the logic directly to avoid needing running server
        
        // Fetch master syllabus
        const { data: masterSyllabus } = await supabase.from('master_syllabus').select('*');
        const masterData = masterSyllabus || [];
        
        if (masterData.length === 0) {
            console.log('No master syllabus found.');
            return;
        }

        const newTopics = masterData.map(topic => {
            const { id, created_at, updated_at, notion_id, ...rest } = topic; 
            return {
                ...rest,
                user_id: userId,
                database_id: newDb.id,
                notion_id: null,
                completed: 'False'
            };
        });

        // Insert in batches
        const BATCH_SIZE = 100;
        let insertedCount = 0;
        for (let i = 0; i < newTopics.length; i += BATCH_SIZE) {
            const batch = newTopics.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase.from('topics').insert(batch);
            if (insertError) {
                console.error('Batch insert error:', insertError.message);
            } else {
                insertedCount += batch.length;
            }
        }
        console.log(`Initialized ${insertedCount} topics.`);
    }
}

checkUserDb();
