import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.error('Supabase Configuration Missing:', {
        url: CONFIG.SUPABASE_URL,
        keyPresent: !!CONFIG.SUPABASE_ANON_KEY
    });
}

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
