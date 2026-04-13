import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const SEG_ID = process.argv[2] || null; // optional: restrict to one segment
const DRY_RUN = process.argv.includes('--dry-run');

// Delete all web_research meal activities (both primary and backup)
// so the rewritten service can start fresh on each segment.
let query = sb.from('trip_activities')
  .select('id, name, segment_id, is_backup, activity_sub_type, date')
  .eq('trip_id', TRIP)
  .eq('restaurant_suggestion_source', 'web_research');

if (SEG_ID) query = query.eq('segment_id', SEG_ID);

const { data: toDelete, error } = await query;
if (error) { console.error(error); process.exit(1); }

console.log(`Found ${toDelete.length} web_research meal activities to delete${SEG_ID ? ` (segment ${SEG_ID})` : ' (all segments)'}`);
const primaries = toDelete.filter(a => !a.is_backup).length;
const backups = toDelete.filter(a => a.is_backup).length;
console.log(`  ${primaries} primaries, ${backups} backups`);

if (DRY_RUN) {
  console.log('--dry-run, not deleting.');
  process.exit(0);
}

// Delete backups first (they reference primaries via alternate_to_activity_id)
const backupIds = toDelete.filter(a => a.is_backup).map(a => a.id);
if (backupIds.length > 0) {
  for (let i = 0; i < backupIds.length; i += 500) {
    const chunk = backupIds.slice(i, i + 500);
    const { error: e } = await sb.from('trip_activities').delete().in('id', chunk);
    if (e) console.error('Backup delete error:', e.message);
  }
  console.log(`Deleted ${backupIds.length} backups`);
}

// Delete primaries
const primaryIds = toDelete.filter(a => !a.is_backup).map(a => a.id);
if (primaryIds.length > 0) {
  for (let i = 0; i < primaryIds.length; i += 500) {
    const chunk = primaryIds.slice(i, i + 500);
    const { error: e } = await sb.from('trip_activities').delete().in('id', chunk);
    if (e) console.error('Primary delete error:', e.message);
  }
  console.log(`Deleted ${primaryIds.length} primaries`);
}

console.log('Done.');
process.exit(0);
