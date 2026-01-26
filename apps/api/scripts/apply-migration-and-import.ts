import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load env
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying migration 035_alternatives_and_route_stops.sql...');

  const migrationSQL = fs.readFileSync(
    '/Users/richard/singularity/supabase/migrations/035_alternatives_and_route_stops.sql',
    'utf-8'
  );

  // Execute migration SQL
  const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    // Try direct SQL execution via postgres
    console.log('RPC failed, trying direct execution...');

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (stmt.includes('ALTER TABLE') || stmt.includes('CREATE INDEX')) {
        console.log('Executing:', stmt.substring(0, 60) + '...');
        // Can't execute DDL directly via supabase-js, need to use dashboard
      }
    }

    console.log('\nMigration needs to be applied via Supabase Dashboard SQL Editor.');
    console.log('Copy the migration file content and run it there:');
    console.log('  https://app.supabase.com/project/fcsiqoebtpfhzreamotp/sql');
    return false;
  }

  console.log('Migration applied successfully!');
  return true;
}

async function importData() {
  console.log('\nImporting test data...');

  const jsonPath = '/Users/richard/Downloads/segment-3-sagres-lagos-research.json';
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Find the Portugal Summer 2026 trip
  const { data: trips, error: tripError } = await supabase
    .from('trips')
    .select('id, name')
    .ilike('name', '%Portugal Summer 2026%')
    .limit(1);

  if (tripError || !trips?.length) {
    console.log('Trip not found:', tripError?.message);
    return;
  }

  const tripId = trips[0].id;
  console.log('Found trip:', trips[0].name, '(', tripId, ')');

  // Find or create segment
  const { data: segments } = await supabase
    .from('trip_segments')
    .select('id, name')
    .eq('trip_id', tripId)
    .ilike('name', '%Sagres%')
    .limit(1);

  const segmentId = segments?.[0]?.id;
  console.log('Found segment:', segments?.[0]?.name, '(', segmentId, ')');

  if (segmentId) {
    // Update segment with route_stops and segment_alternatives
    const segmentAlternatives = payload.alternatives?.filter(
      (alt: any) => !alt.replaces || (!alt.replaces.scheduled_activity_id && !alt.replaces.scheduled_activity_name)
    ) || [];

    console.log('Route stops to import:', payload.route_stops?.length || 0);
    console.log('Segment alternatives to import:', segmentAlternatives.length);

    const { error: updateError } = await supabase
      .from('trip_segments')
      .update({
        route_stops: payload.route_stops || null,
        segment_alternatives: segmentAlternatives.length > 0 ? segmentAlternatives : null,
      })
      .eq('id', segmentId);

    if (updateError) {
      console.log('Error updating segment:', updateError.message);
      if (updateError.message.includes('column')) {
        console.log('\n⚠️  The route_stops/segment_alternatives columns do not exist.');
        console.log('Please apply the migration first via Supabase Dashboard:');
        console.log('  https://app.supabase.com/project/fcsiqoebtpfhzreamotp/sql');
        console.log('\nMigration file: supabase/migrations/035_alternatives_and_route_stops.sql');
      }
    } else {
      console.log('✓ Segment updated with route_stops and segment_alternatives');
    }

    // Import linked alternatives as activities
    const linkedAlternatives = payload.alternatives?.filter(
      (alt: any) => alt.replaces && (alt.replaces.scheduled_activity_id || alt.replaces.scheduled_activity_name)
    ) || [];

    console.log('Linked alternatives to import:', linkedAlternatives.length);

    // Get existing activities to match by name
    const { data: activities } = await supabase
      .from('trip_activities')
      .select('id, name')
      .eq('trip_id', tripId);

    const activityNameToId = new Map(
      activities?.map(a => [a.name.toLowerCase(), a.id]) || []
    );

    for (const alt of linkedAlternatives) {
      let alternateToId: string | null = null;
      if (alt.replaces?.scheduled_activity_name) {
        alternateToId = activityNameToId.get(alt.replaces.scheduled_activity_name.toLowerCase()) || null;
      }

      const altActivity = {
        trip_id: tripId,
        segment_id: segmentId,
        name: alt.name,
        activity_type: alt.item_type || 'activity',
        is_backup: true,
        alternate_to_activity_id: alternateToId,
        alternative_type: 'direct_replacement',
        alternative_trigger: alt.trigger,
        why_not_scheduled: alt.why_not_scheduled,
        priority: alt.priority,
        sort_order: 999,
      };

      // Check if already exists
      const { data: existing } = await supabase
        .from('trip_activities')
        .select('id')
        .eq('trip_id', tripId)
        .eq('name', alt.name)
        .eq('is_backup', true)
        .limit(1);

      if (existing?.length) {
        console.log(`  Skipping "${alt.name}" (already exists)`);
        continue;
      }

      const { error: insertError } = await supabase
        .from('trip_activities')
        .insert(altActivity);

      if (insertError) {
        console.log(`  Error inserting "${alt.name}":`, insertError.message);
      } else {
        console.log(`  ✓ Imported "${alt.name}" (replaces: ${alt.replaces?.scheduled_activity_name || 'none'})`);
      }
    }
  }
}

async function main() {
  console.log('=== Migration & Import Script ===\n');
  console.log('Supabase URL:', supabaseUrl);

  await applyMigration();
  await importData();

  console.log('\n=== Done ===');
}

main().catch(console.error);
