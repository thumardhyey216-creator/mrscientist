
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.nqpfjsduwxyrwclpssig:dhyeythumar1@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const client = new Client({
  connectionString,
});

async function initUserData() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    const email = 'thumardhyey36@gmail.com';

    // 1. Get User ID
    const res = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
        console.log('❌ User not found');
        return;
    }
    const userId = res.rows[0].id;
    console.log(`👤 Found user ID: ${userId}`);

    // 2. Check if data exists
    const check = await client.query('SELECT count(*) FROM topics WHERE user_id = $1', [userId]);
    if (parseInt(check.rows[0].count) > 0) {
        console.log('⚠️ User already has topics. Skipping.');
        return;
    }

    // 3. Copy from master_syllabus
    console.log('🔄 Initializing topics...');
    
    // We select from master_syllabus and insert into topics
    // We explicitely select columns to match target, excluding id (auto) and setting user_id
    // and setting notion_id to NULL
    
    // First, let's get the columns of master_syllabus to be dynamic, or just hardcode the common ones
    // Easier to just use specific common columns if we know them, but `INSERT INTO ... SELECT` is best.
    
    // We need to map columns. 
    // topics: id, created_at, topic_name, ... user_id, notion_id (NULL)
    
    // Let's just do it via fetching and inserting in JS to handle column mapping easily
    // Fetch master
    const masterRes = await client.query('SELECT * FROM master_syllabus');
    const masterData = masterRes.rows;
    console.log(`   Found ${masterData.length} master topics.`);

    if (masterData.length === 0) {
        console.log('❌ No master syllabus found!');
        return;
    }

    // Prepare batch insert
    // We construct the INSERT query dynamically or loop
    // Since we have pg, we can use a loop or a big insert.
    // Let's use a loop with batching for safety.
    
    let inserted = 0;
    for (const topic of masterData) {
        const { id, created_at, updated_at, notion_id, user_id: oldUid, ...rest } = topic;
        
        const keys = Object.keys(rest);
        const values = Object.values(rest);
        
        // Add user_id and set notion_id null explicitly (or omit it)
        keys.push('user_id');
        values.push(userId);
        
        // We ensure notion_id is not in keys, so it defaults to null (if nullable)
        // Check if we need to set other fields explicitly
        
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.map(k => `"${k}"`).join(', '); // quote columns for safety
        
        const query = `INSERT INTO topics (${columns}) VALUES (${placeholders})`;
        
        await client.query(query, values);
        inserted++;
        if (inserted % 100 === 0) process.stdout.write('.');
    }
    
    console.log(`\n✅ Successfully initialized ${inserted} topics for user.`);

  } catch (err) {
    console.error('❌ Failed:', err);
  } finally {
    await client.end();
  }
}

initUserData();
