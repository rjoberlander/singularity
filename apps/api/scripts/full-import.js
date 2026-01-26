const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fullImport() {
  const tripId = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
  const segmentId = '4f5d2d2f-c4d2-4427-95f4-1e5facc954da';

  const payload = JSON.parse(fs.readFileSync('/Users/richard/Downloads/segment-3-sagres-lagos-research.json', 'utf-8'));

  console.log('=== FULL IMPORT ===');
  console.log('Trip:', tripId);
  console.log('Segment:', segmentId);
  console.log('Research items:', payload.research_items?.length || 0);
  console.log('Days:', payload.days?.length || 0);
  console.log('Route stops:', payload.route_stops?.length || 0);
  console.log('Alternatives:', payload.alternatives?.length || 0);

  // 1. Update segment with city_info and other data
  console.log('\n--- Updating segment data ---');
  const segmentUpdate = {
    name: payload.segment.name,
    description: payload.segment.theme,
    theme: payload.segment.theme,
    city_info: payload.segment.city_info,
    packing_list: payload.segment.packing_additions?.map(item => ({ item, category: 'segment-specific' })),
    route_stops: payload.route_stops || null,
    segment_alternatives: payload.alternatives?.filter(alt => !alt.replaces) || null,
  };

  const { error: segmentError } = await supabase
    .from('trip_segments')
    .update(segmentUpdate)
    .eq('id', segmentId);

  if (segmentError) {
    console.log('Segment update error:', segmentError.message);
  } else {
    console.log('✓ Segment updated');
  }

  // 2. Create days
  console.log('\n--- Creating days ---');
  for (const day of payload.days || []) {
    // Check if day exists
    const { data: existingDay } = await supabase
      .from('trip_days')
      .select('id')
      .eq('segment_id', segmentId)
      .eq('date', day.date)
      .single();

    let dayId;
    if (existingDay) {
      dayId = existingDay.id;
      console.log(`  Day ${day.day_number} (${day.date}) already exists`);
    } else {
      const { data: newDay, error: dayError } = await supabase
        .from('trip_days')
        .insert({
          trip_id: tripId,
          segment_id: segmentId,
          date: day.date,
          day_number: day.day_number,
          title: day.title,
          theme: day.theme,
          notes: day.driving ? `Drive from ${day.driving.from} to ${day.driving.to} (${day.driving.distance})` : null,
        })
        .select()
        .single();

      if (dayError) {
        console.log(`  Day ${day.day_number} error:`, dayError.message);
        continue;
      }
      dayId = newDay.id;
      console.log(`  ✓ Created Day ${day.day_number}: ${day.title}`);
    }

    // Create activities for this day from the schedule
    if (day.schedule) {
      for (const scheduleItem of day.schedule) {
        // Find the research item for this schedule item
        const researchItem = payload.research_items?.find(ri => ri.id === scheduleItem.item_id);

        if (!researchItem) {
          console.log(`    Skipping ${scheduleItem.item_id} - not found in research_items`);
          continue;
        }

        // Check if activity already exists
        const { data: existingActivity } = await supabase
          .from('trip_activities')
          .select('id')
          .eq('trip_id', tripId)
          .eq('day_id', dayId)
          .eq('name', researchItem.name)
          .single();

        if (existingActivity) {
          console.log(`    Activity "${researchItem.name}" already exists`);
          continue;
        }

        const activity = {
          trip_id: tripId,
          segment_id: segmentId,
          day_id: dayId,
          name: researchItem.name,
          description: researchItem.description,
          activity_type: researchItem.item_type || 'activity',
          priority: researchItem.priority,
          start_time: scheduleItem.time?.split('-')[0]?.trim() || null,
          duration_minutes: researchItem.practical?.duration ? parseInt(researchItem.practical.duration) || 60 : 60,
          is_backup: false,
          // Location
          location_name: researchItem.location?.name,
          address: researchItem.location?.address,
          latitude: researchItem.location?.lat,
          longitude: researchItem.location?.lng,
          google_maps_url: researchItem.location?.google_maps_url,
          // Rich content
          deep_dive: researchItem.deep_dive,
          kid_engagement: researchItem.kid_engagement,
          practical_details: researchItem.practical,
          tips: researchItem.tips,
          sort_order: scheduleItem.order || 0,
        };

        const { error: actError } = await supabase
          .from('trip_activities')
          .insert(activity);

        if (actError) {
          console.log(`    Activity "${researchItem.name}" error:`, actError.message);
        } else {
          console.log(`    ✓ Created activity: ${researchItem.name}`);
        }
      }
    }
  }

  // 3. Create linked alternatives as backup activities
  console.log('\n--- Creating alternative activities ---');
  const linkedAlternatives = (payload.alternatives || []).filter(alt => alt.replaces);

  for (const alt of linkedAlternatives) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('trip_activities')
      .select('id')
      .eq('trip_id', tripId)
      .eq('name', alt.name)
      .eq('is_backup', true)
      .single();

    if (existing) {
      console.log(`  Alternative "${alt.name}" already exists`);
      continue;
    }

    const altActivity = {
      trip_id: tripId,
      segment_id: segmentId,
      name: alt.name,
      description: alt.deep_dive?.what_it_is,
      activity_type: alt.item_type || 'activity',
      is_backup: true,
      alternative_type: 'direct_replacement',
      alternative_trigger: alt.trigger,
      why_not_scheduled: alt.why_not_scheduled,
      location_name: alt.location?.name,
      google_maps_url: alt.location?.google_maps_url,
      deep_dive: alt.deep_dive,
      kid_engagement: alt.kid_engagement,
      practical_details: alt.practical,
      sort_order: 999,
    };

    const { error } = await supabase
      .from('trip_activities')
      .insert(altActivity);

    if (error) {
      console.log(`  Alternative "${alt.name}" error:`, error.message);
    } else {
      console.log(`  ✓ Created alternative: ${alt.name}`);
    }
  }

  // Verify final counts
  console.log('\n=== VERIFICATION ===');
  const { count: dayCount } = await supabase
    .from('trip_days')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', segmentId);

  const { count: actCount } = await supabase
    .from('trip_activities')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', segmentId)
    .eq('is_backup', false);

  const { count: altCount } = await supabase
    .from('trip_activities')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', segmentId)
    .eq('is_backup', true);

  console.log('Days in segment:', dayCount);
  console.log('Activities (scheduled):', actCount);
  console.log('Activities (alternatives):', altCount);
}

fullImport().catch(console.error);
