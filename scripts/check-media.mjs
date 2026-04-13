import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TRIP = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

async function fetchAll(table, columns = '*') {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(columns).eq('trip_id', TRIP).range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

const media = await fetchAll('trip_media', 'id,parent_id,parent_type,created_at');
console.log('Total rows for trip:', media.length);
const byType = {};
for (const m of media) byType[m.parent_type] = (byType[m.parent_type] || 0) + 1;
console.log('By parent_type:', byType);

// Breakdown by created date
const byDay = {};
for (const m of media) {
  if (m.parent_type !== 'activity') continue;
  const d = (m.created_at || '').slice(0, 10);
  byDay[d] = (byDay[d] || 0) + 1;
}
console.log('\nActivity media by created_at:');
for (const [d, n] of Object.entries(byDay).sort()) console.log('  ' + d + ': ' + n);

// Porto specifically
const acts = await fetchAll('trip_activities', 'id,segment_id,name');
const { data: segs } = await sb.from('trip_segments').select('id,name,segment_number').eq('trip_id', TRIP).order('segment_number');
const porto = segs.find(s => s.name === 'Porto');
const portoActs = new Set(acts.filter(a => a.segment_id === porto.id).map(a => a.id));
const portoMedia = media.filter(m => m.parent_type === 'activity' && portoActs.has(m.parent_id));
console.log('\nPorto activity media rows:', portoMedia.length);
const portoByDay = {};
for (const m of portoMedia) {
  const d = (m.created_at || '').slice(0, 10);
  portoByDay[d] = (portoByDay[d] || 0) + 1;
}
for (const [d, n] of Object.entries(portoByDay).sort()) console.log('  ' + d + ': ' + n);
