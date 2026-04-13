const fs = require('fs');
const pg = require('pg');

async function tryConnect(config, label) {
  const client = new pg.Client(config);
  try {
    await client.connect();
    console.log(`  ${label}: CONNECTED!`);
    return client;
  } catch (e) {
    console.log(`  ${label}: ${e.message.substring(0, 80)}`);
    return null;
  }
}

async function run() {
  const ssl = { rejectUnauthorized: false };
  const password = '0FKmjWfS84dkGrHe';
  const ref = 'cymbadkegbibhxbfevuq';

  const configs = [];

  // Session mode pooler (port 5432)
  for (const region of ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1']) {
    configs.push({
      label: `session-pooler ${region}`,
      config: {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 5432,
        database: 'postgres',
        user: `postgres.${ref}`,
        password,
        ssl,
        connectionTimeoutMillis: 5000,
      }
    });
  }

  // Direct with options to force IPv4
  configs.push({
    label: 'direct-ipv4',
    config: {
      host: `db.${ref}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password,
      ssl,
      connectionTimeoutMillis: 10000,
      // Force IPv4
      family: 4,
    }
  });

  for (const { label, config } of configs) {
    const client = await tryConnect(config, label);
    if (client) {
      console.log('\nApplying migration...');
      const sql = fs.readFileSync('/Users/richard/singularity/supabase/migrations/060_journal_broadcasts.sql', 'utf8');
      try {
        await client.query(sql);
        console.log('Migration applied successfully!');

        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'entry_type'");
        console.log('entry_type column exists:', res.rows.length > 0);

        const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'broadcast%'");
        console.log('Broadcast tables:', tables.rows.map(r => r.tablename));
      } catch (e) {
        console.error('Migration error:', e.message);
      }
      await client.end();
      return;
    }
  }

  console.log('\nAll connection methods failed.');
}

run();
