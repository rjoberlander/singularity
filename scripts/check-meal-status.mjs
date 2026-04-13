import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number').eq('trip_id', TRIP).order('segment_number');
const { data: acts } = await sb.from('trip_activities')
  .select('id,name,activity_type,segment_id,restaurant_suggestion_source')
  .eq('trip_id', TRIP)
  .in('activity_type', ['restaurant', 'cafe', 'dining']);

const GENERIC = /^((early|quick|light|big|full|easy|simple|late|fast|hotel|room|family|kids?)\s+)?(breakfast|lunch|dinner|supper|brunch)$/i;
const VAGUE = /^(breakfast|lunch|dinner|brunch)\s/i;

function needsResearch(a) {
  if (a.restaurant_suggestion_source === 'web_research' || a.restaurant_suggestion_source === 'user_manual') return false;
  if (GENERIC.test(a.name.trim())) return true;
  if (VAGUE.test(a.name.trim())) return true;
  return false;
}

console.log('#  Segment                          Total Meals  Web Researched  Still Generic');
for (const s of segs) {
  const segMeals = acts.filter(a => a.segment_id === s.id);
  const researched = segMeals.filter(a => a.restaurant_suggestion_source === 'web_research').length;
  const generic = segMeals.filter(a => needsResearch(a)).length;
  console.log(
    String(s.segment_number).padEnd(3) +
    s.name.padEnd(34) +
    String(segMeals.length).padEnd(13) +
    String(researched).padEnd(16) +
    generic
  );
}
process.exit(0);
