
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

async function inspectTable() {
    console.log('Inspecting user_databases table...');
    
    // We can use the rpc 'get_table_info' if it exists, or try to insert a dummy to get a type error, 
    // or just assume we need to fix it.
    // Let's try to get column info via a query if possible, or use the manage_schema rpc if it supports 'list' (it didn't seem to).
    // Actually, let's use the 'get_table_info' RPC that was mentioned in server/index.js if available.
    
    try {
        const { data, error } = await supabase.rpc('get_table_info', { t_name: 'user_databases' });
        if (error) {
            console.log('RPC get_table_info failed:', error.message);
            // Fallback: Check if we can select one row and see types? No, type info is metadata.
            // Let's try to infer from a bad query.
        } else {
            console.log('Table Info:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log(e);
    }
}

inspectTable();
