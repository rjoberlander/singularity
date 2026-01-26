const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAndLink() {
  const tripId = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
  const segmentId = '4f5d2d2f-c4d2-4427-95f4-1e5facc954da';

  // Get all activities for this segment
  const { data: activities } = await supabase
    .from('trip_activities')
    .select('id, name, is_backup')
    .eq('segment_id', segmentId);

  console.log('Activities in Sagres segment:');
  (activities || []).filter(a => !a.is_backup).forEach(a => {
    console.log('  -', a.name, '| id:', a.id.substring(0, 8));
  });

  // Find boat tour activity
  const boatTour = (activities || []).find(a =>
    !a.is_backup && (
      a.name.toLowerCase().includes('boat') ||
      a.name.toLowerCase().includes('grotto') ||
      a.name.toLowerCase().includes('ponta')
    )
  );

  const beach = (activities || []).find(a =>
    !a.is_backup && (
      a.name.toLowerCase().includes('meia praia') ||
      a.name.toLowerCase().includes('beach')
    )
  );

  console.log('\nFound matches:');
  console.log('  Boat tour:', boatTour?.name || 'not found');
  console.log('  Beach:', beach?.name || 'not found');

  // Update alternatives to link to the correct activities
  if (boatTour) {
    const boatAlts = ['Kayak Tour', 'Benagil Cave', 'Dolphin Watching', 'Sunset Grotto', 'Stand-Up Paddleboard'];
    for (const altName of boatAlts) {
      const { error } = await supabase
        .from('trip_activities')
        .update({ alternate_to_activity_id: boatTour.id })
        .eq('segment_id', segmentId)
        .eq('is_backup', true)
        .ilike('name', '%' + altName + '%');

      if (!error) console.log('  Linked', altName, 'to', boatTour.name);
    }
  }

  if (beach) {
    const { error } = await supabase
      .from('trip_activities')
      .update({ alternate_to_activity_id: beach.id })
      .eq('segment_id', segmentId)
      .eq('is_backup', true)
      .ilike('name', '%Praia Dona Ana%');

    if (!error) console.log('  Linked Praia Dona Ana to', beach.name);
  }

  // Verify final state
  const { data: altActivities } = await supabase
    .from('trip_activities')
    .select('id, name, alternate_to_activity_id')
    .eq('segment_id', segmentId)
    .eq('is_backup', true);

  console.log('\n=== Final Alternative Activities ===');
  for (const alt of (altActivities || [])) {
    const parent = (activities || []).find(a => a.id === alt.alternate_to_activity_id);
    console.log('  -', alt.name);
    console.log('    replaces:', parent?.name || '(general backup)');
  }
}

checkAndLink().catch(console.error);
