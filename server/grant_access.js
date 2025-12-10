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

const checkSetup = async () => {
    console.log("🛠️  Checking Database Setup...");

    // 1. Check 'topics' table (Should exist)
    const { data: topics, error: topicsError } = await supabase.from('topics').select('id').limit(1);
    if (topicsError) {
        console.error("❌ 'topics' table check failed:", topicsError.message);
    } else {
        console.log("✅ 'topics' table is accessible.");
    }

    // 2. Check 'profiles' table (The one causing error)
    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id').limit(1);
    if (profilesError) {
        console.error("❌ 'profiles' table check failed:", profilesError.message);
        console.error("   Reason: The table likely doesn't exist.");
        console.error("\n👉 ACTION REQUIRED: You need to run the SQL script in Supabase Dashboard.");
        console.error("   1. Go to Supabase Dashboard > SQL Editor");
        console.error("   2. Copy content from: server/setup_subscription.sql");
        console.error("   3. Run the script.");
    } else {
        console.log("✅ 'profiles' table exists.");
        
        // If it exists, try to grant access again
        await grantAccess('thumardhyey36@gmail.com');
    }
};

const grantAccess = async (email) => {
    console.log(`\n🔍 Granting access to: ${email}...`);
    
    // Check if user exists in profiles (which mirrors auth.users)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email);

    if (error || !profiles || profiles.length === 0) {
        console.log("⚠️  User profile not found.");
        console.log("   Note: The user must sign up in the app first.");
        return;
    }

    const user = profiles[0];
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            subscription_status: 'active',
            subscription_plan: 'admin_free_pass',
            subscription_expiry: '2099-12-31T23:59:59Z'
        })
        .eq('id', user.id);

    if (updateError) {
        console.error("❌ Update failed:", updateError.message);
    } else {
        console.log("🎉 SUCCESS! Free access granted.");
    }
};

checkSetup();
