
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

async function checkPolicies() {
    console.log('Checking policies for user_databases...');
    const { data, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'user_databases');

    if (error) {
        console.log('Error checking policies:', error.message);
    } else {
        console.log('Policies:', data);
    }
    
    // Check if RLS is enabled
    const { data: tables, error: tableError } = await supabase
        .from('pg_tables')
        .select('*')
        .eq('tablename', 'user_databases');
        
    if (tables && tables.length > 0) {
        console.log('Table info:', tables[0]);
        // pg_tables has rowsecurity boolean?
        // Actually pg_tables view: schemaname, tablename, tableowner, tablespace, hasindexes, hasrules, hastriggers, rowsecurity
        console.log('RLS Enabled:', tables[0].rowsecurity);
    }
}

checkPolicies();
