import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const SEG = '4f5d2d2f-c4d2-4427-95f4-1e5facc954da';

const { data: acts } = await sb
  .from('trip_activities')
  .select('id,name,activity_type,restaurant_suggestion_source,restaurant_details,google_place_id,google_rating,google_review_count,is_backup,alternate_to_activity_id')
  .eq('segment_id', SEG)
  .eq('trip_id', TRIP)
  .eq('restaurant_suggestion_source', 'web_research')
  .order('name');

console.log(acts.length + ' web-researched meal activities in Sagres:\n');
for (const a of acts) {
  const d = a.restaurant_details || {};
  console.log((a.is_backup ? '  ALT: ' : '  PRIMARY: ') + a.name);
  console.log('    Rating: ' + (a.google_rating || '?') + '/5 (' + (a.google_review_count || '?') + ' reviews)');
  console.log('    Cuisine: ' + (d.cuisine_type || '?'));
  console.log('    Local insight: ' + (d.local_insight || '?'));
  if (d.signature_dishes?.length) {
    console.log('    Dishes to order:');
    for (const dish of d.signature_dishes) {
      console.log('      - ' + dish.name + (dish.is_local_specialty ? ' [LOCAL]' : '') + (dish.kid_friendly ? ' [KID-OK]' : ''));
      if (dish.description) console.log('        ' + dish.description);
    }
  }
  if (d.family_tips) console.log('    Kids: ' + d.family_tips);
  if (d.reservation_tips) console.log('    Tips: ' + d.reservation_tips);
  console.log();
}
process.exit(0);
