// Apply migration using pg directly (bypasses Supabase REST API)
const fs = require('fs');

async function run() {
  // Dynamically import pg
  let pg;
  try {
    pg = require('pg');
  } catch (e) {
    console.log('Installing pg...');
    require('child_process').execSync('npm install pg --no-save', { stdio: 'inherit' });
    pg = require('pg');
  }

  const ssl = { rejectUnauthorized: false };

  // Try direct connection (IPv6)
  const client = new pg.Client({
    host: 'db.cymbadkegbibhxbfevuq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '0FKmjWfS84dkGrHe',
    ssl,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const sql = fs.readFileSync('/Users/richard/singularity/supabase/migrations/060_journal_broadcasts.sql', 'utf8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');

    // Verify
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'entry_type'");
    console.log('entry_type column exists:', res.rows.length > 0);

    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'broadcast%' OR tablename = 'google_contacts_cache'");
    console.log('New tables:', tables.rows.map(r => r.tablename));

  } catch (err) {
    console.error('Error:', err.message);

    // If direct fails, try pooler with different regions
    console.log('\nDirect connection failed, trying pooler...');
    const regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1'];

    for (const region of regions) {
      const poolerClient = new pg.Client({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: 'postgres.cymbadkegbibhxbfevuq',
        password: '0FKmjWfS84dkGrHe',
        ssl,
        connectionTimeoutMillis: 5000,
      });

      try {
        console.log(`  Trying ${region}...`);
        await poolerClient.connect();
        console.log(`  Connected via ${region}!`);

        const sql = fs.readFileSync('/Users/richard/singularity/supabase/migrations/060_journal_broadcasts.sql', 'utf8');
        await poolerClient.query(sql);
        console.log('  Migration applied successfully!');

        const res = await poolerClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'entry_type'");
        console.log('  entry_type column exists:', res.rows.length > 0);

        await poolerClient.end();
        return;
      } catch (e) {
        console.log(`  ${region}: ${e.message}`);
        try { await poolerClient.end(); } catch {}
      }
    }
  } finally {
    try { await client.end(); } catch {}
  }
}

run();
