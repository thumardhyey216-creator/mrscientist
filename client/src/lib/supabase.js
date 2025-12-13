import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

console.log('🔧 Supabase: Initializing client...', {
    url: CONFIG.SUPABASE_URL?.substring(0, 30) + '...',
    keyPresent: !!CONFIG.SUPABASE_ANON_KEY
});

if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    console.error('❌ Supabase Configuration Missing:', {
        url: CONFIG.SUPABASE_URL,
        keyPresent: !!CONFIG.SUPABASE_ANON_KEY
    });
}

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
console.log('✅ Supabase: Client created');
