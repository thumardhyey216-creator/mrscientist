
import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres.nqpfjsduwxyrwclpssig:dhyeythumar1@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const client = new Client({
  connectionString,
});

async function confirmUsers() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Update all unconfirmed users
    const result = await client.query(`
      UPDATE auth.users
      SET email_confirmed_at = NOW()
      WHERE email_confirmed_at IS NULL
      RETURNING email;
    `);

    if (result.rowCount > 0) {
        console.log(`✅ Successfully confirmed ${result.rowCount} users:`);
        result.rows.forEach(row => console.log(`   - ${row.email}`));
    } else {
        console.log('👍 All users are already confirmed.');
    }

  } catch (err) {
    console.error('❌ Failed to confirm users:', err);
  } finally {
    await client.end();
  }
}

confirmUsers();
