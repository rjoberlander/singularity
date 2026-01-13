// Run migration 032 - Phase Context Functions
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

async function runMigration() {
  const migrationPath = path.join(__dirname, '../../../supabase/migrations/032_travel_phase_context_functions.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Running migration 032...');

  // Split by function definitions and run each
  const statements = sql.split(/(?=CREATE OR REPLACE FUNCTION|COMMENT ON FUNCTION)/);

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: trimmed });
      if (error) {
        console.log('Statement:', trimmed.substring(0, 100) + '...');
        console.error('Error:', error.message);
      }
    } catch (e) {
      // exec_sql might not exist, try alternative
      console.log('Note: exec_sql not available, migration needs to be run manually');
      break;
    }
  }

  console.log('Done!');
}

runMigration().catch(console.error);
