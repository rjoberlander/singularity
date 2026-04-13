import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const SEG = '4f5d2d2f-c4d2-4427-95f4-1e5facc954da';

// Get days
const { data: days } = await sb.from('trip_days').select('id,date,day_number').eq('segment_id', SEG).order('date');

// Get all activities
const { data: acts } = await sb.from('trip_activities')
  .select('id,name,activity_type,activity_sub_type,restaurant_suggestion_source,restaurant_details,google_place_id,google_rating,google_review_count,is_backup,day_id,date,sort_order,latitude,longitude')
  .eq('segment_id', SEG).eq('trip_id', TRIP)
  .order('sort_order');

for (const day of days) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`DAY ${day.day_number} — ${day.date}`);
  console.log('═'.repeat(60));

  const dayActs = acts.filter(a => a.day_id === day.id && !a.is_backup);

  // Show non-meal activities for route context
  const nonMeals = dayActs.filter(a => a.activity_type !== 'restaurant');
  if (nonMeals.length > 0) {
    console.log('\n  Route context:');
    for (const a of nonMeals) {
      const loc = (a.latitude && a.longitude) ? ` (${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)})` : '';
      console.log(`    ${a.activity_type?.padEnd(12) || '?'.padEnd(12)} ${a.name}${loc}`);
    }
  }

  // Show meals
  const meals = dayActs.filter(a => a.activity_type === 'restaurant' && a.restaurant_suggestion_source === 'web_research');
  if (meals.length > 0) {
    console.log('\n  Meals:');
    for (const m of meals) {
      const d = m.restaurant_details || {};
      const backup = acts.find(a => a.is_backup && a.alternate_to_activity_id === m.id);
      const loc = (m.latitude && m.longitude) ? ` (${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)})` : '';
      console.log(`\n    ${(m.activity_sub_type || '?').toUpperCase()}: ${m.name}`);
      console.log(`      Rating: ${m.google_rating || '?'}/5 (${m.google_review_count || '?'} reviews)${loc}`);
      console.log(`      Cuisine: ${d.cuisine_type || '?'}`);
      console.log(`      Why: ${d.local_insight || '?'}`);
      if (d.signature_dishes?.length) {
        console.log(`      Order:`);
        for (const dish of d.signature_dishes.slice(0, 3)) {
          console.log(`        - ${dish.name}${dish.is_local_specialty ? ' [LOCAL]' : ''}${dish.kid_friendly ? ' [KID-OK]' : ''}`);
        }
      }
      if (d.family_tips) console.log(`      Kids: ${d.family_tips}`);
      if (d.reservation_tips) console.log(`      Tips: ${d.reservation_tips}`);
      if (backup) console.log(`      Backup: ${backup.name} (${backup.google_rating || '?'}/5)`);
    }
  }
}

process.exit(0);
