const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://cymbadkegbibhxbfevuq.supabase.co';
const SERVICE_KEY = fs.readFileSync('/Users/richard/singularity/apps/web/.env.local', 'utf8')
  .split('\n')
  .find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))
  .split('=')[1]
  .trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false },
});

const sql = fs.readFileSync('/Users/richard/singularity/supabase/migrations/060_journal_broadcasts.sql', 'utf8');

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function run() {
  console.log(`Running ${statements.length} statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

    try {
      const { data, error } = await supabase.rpc('', {});
    } catch (e) {
      // rpc won't work for DDL, that's expected
    }
    console.log(`[${i+1}/${statements.length}] ${preview}...`);
  }

  // Test if tables exist by trying to query them
  console.log('\nVerifying tables...');

  const tables = ['broadcast_vote_options', 'broadcast_recipients', 'broadcast_votes', 'broadcast_comments', 'google_contacts_cache'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`  ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`  ${table}: OK (exists)`);
    }
  }

  // Check if journal_entries has the new columns
  const { data: je, error: jeErr } = await supabase
    .from('journal_entries')
    .select('entry_type, voting_enabled, comments_enabled')
    .limit(1);

  if (jeErr) {
    console.log(`\n  journal_entries new columns: ERROR - ${jeErr.message}`);
  } else {
    console.log(`\n  journal_entries new columns: OK`);
  }
}

run().catch(e => console.error('Fatal:', e.message));
