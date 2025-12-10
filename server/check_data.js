
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    const { data, error } = await supabase.from('user_databases').select('*');
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Data count:', data.length);
        console.log('Sample:', data.slice(0, 3));
    }
}

checkData();
