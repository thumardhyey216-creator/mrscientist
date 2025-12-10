
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

async function fixSchema() {
    console.log('Fixing user_databases schema...');

    // 1. Drop user_id (integer)
    console.log('Dropping user_id column...');
    const { data: dropData, error: dropError } = await supabase.rpc('manage_schema', {
        operation: 'delete',
        t_name: 'user_databases',
        col_name: 'user_id'
    });

    if (dropError) {
        console.error('Error dropping column:', dropError.message);
        // If it fails, maybe because of foreign key or policy?
    } else {
        console.log('Dropped user_id:', dropData);
    }

    // 2. Add user_id (UUID)
    console.log('Adding user_id column as UUID...');
    const { data: addData, error: addError } = await supabase.rpc('manage_schema', {
        operation: 'add',
        t_name: 'user_databases',
        col_name: 'user_id',
        col_type: 'UUID REFERENCES auth.users(id) ON DELETE CASCADE'
    });

    if (addError) {
        console.error('Error adding column:', addError.message);
    } else {
        console.log('Added user_id:', addData);
    }
}

fixSchema();
