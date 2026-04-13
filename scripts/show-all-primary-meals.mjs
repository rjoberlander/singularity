import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number').eq('trip_id', TRIP).order('segment_number');

for (const s of segs) {
  const { data } = await sb.from('trip_activities')
    .select('name,date,activity_sub_type')
    .eq('segment_id', s.id)
    .eq('restaurant_suggestion_source', 'web_research')
    .eq('is_backup', false)
    .order('date')
    .order('sort_order');
  if (!data?.length) continue;
  console.log(`\n[${s.name}]`);
  for (const a of data) {
    console.log(`  ${a.date || 'unsched'}  ${(a.activity_sub_type || '?').padEnd(10)} ${a.name}`);
  }
}
process.exit(0);
