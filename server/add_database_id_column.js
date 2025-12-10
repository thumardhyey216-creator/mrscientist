
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

async function addColumn() {
    console.log('Attempting to add database_id column via manage_schema RPC...');

    try {
        const { data, error } = await supabase.rpc('manage_schema', {
            operation: 'add',
            t_name: 'topics',
            col_name: 'database_id',
            col_type: 'UUID REFERENCES public.user_databases(id) ON DELETE CASCADE'
        });

        if (error) {
            console.error('RPC Error:', error);
            // Fallback: maybe the function doesn't exist or parameters are wrong
            // If it fails, we might need to rely on the user running SQL
        } else {
            console.log('Success:', data);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

addColumn();
