
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMasterData() {
    console.log('Checking master_syllabus count...');
    const { count, error } = await supabase
        .from('master_syllabus')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking master_syllabus:', error);
    } else {
        console.log(`master_syllabus count: ${count}`);
    }

    console.log('Checking user_databases...');
    const { data: dbs, error: dbError } = await supabase
        .from('user_databases')
        .select('*');
        
    if (dbError) {
        console.error('Error fetching user_databases:', dbError);
    } else {
        console.log(`Found ${dbs.length} user databases.`);
        dbs.forEach(db => console.log(`- ${db.name} (${db.id})`));
    }
}

checkMasterData();
