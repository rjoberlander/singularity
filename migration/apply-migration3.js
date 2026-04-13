const fs = require('fs');
const pg = require('pg');
const dns = require('dns');

async function run() {
  const ssl = { rejectUnauthorized: false };
  const password = '0FKmjWfS84dkGrHe';
  const ref = 'cymbadkegbibhxbfevuq';

  // Force DNS to prefer IPv4
  dns.setDefaultResultOrder('ipv4first');

  // Try direct connection with IPv4 forced via dns
  console.log('Attempting direct connection (IPv4 preferred)...');
  const directClient = new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password,
    ssl,
    connectionTimeoutMillis: 10000,
  });

  try {
    await directClient.connect();
    console.log('Connected directly!');

    const sql = fs.readFileSync('/Users/richard/singularity/supabase/migrations/060_journal_broadcasts.sql', 'utf8');
    await directClient.query(sql);
    console.log('Migration applied!');

    const res = await directClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'entry_type'");
    console.log('entry_type column:', res.rows.length > 0 ? 'EXISTS' : 'MISSING');

    const tables = await directClient.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'broadcast%'");
    console.log('Tables:', tables.rows.map(r => r.tablename));

    await directClient.end();
    return;
  } catch (e) {
    console.log('Direct failed:', e.message.substring(0, 100));
  }

  // Session mode pooler (port 5432) - supports DDL
  // Also try port 6543 session mode with prepare_threshold=0
  const attempts = [];
  for (const region of ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1']) {
    for (const port of [5432, 6543]) {
      attempts.push({ region, port });
    }
  }

  for (const { region, port } of attempts) {
    const client = new pg.Client({
      host: `aws-0-${region}.pooler.supabase.com`,
      port,
      database: 'postgres',
      user: `postgres.${ref}`,
      password,
      ssl,
      connectionTimeoutMillis: 5000,
    });

    try {
      await client.connect();
      console.log(`Connected via pooler ${region}:${port}!`);

      const sql = fs.readFileSync('/Users/richard/singularity/supabase/migrations/060_journal_broadcasts.sql', 'utf8');
      await client.query(sql);
      console.log('Migration applied!');

      await client.end();
      return;
    } catch (e) {
      const msg = e.message.substring(0, 60);
      if (!msg.includes('Tenant')) {
        console.log(`  ${region}:${port}: ${msg}`);
      }
      try { await client.end(); } catch {}
    }
  }

  console.log('All attempts failed. Please run the SQL manually in Supabase Dashboard SQL Editor.');
}

run();
