import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kcqfobljyraeemvdtygy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Check the activity data for the Portugal 2026 trip
const tripId = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';

const { data: activities, error } = await supabase
  .from('trip_activities')
  .select('id, name, activity_type, deep_dive, kid_engagement, deep_dive_content')
  .eq('trip_id', tripId)
  .ilike('name', '%pena%')
  .limit(5);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Activities found:', activities?.length || 0);
  activities?.forEach(a => {
    console.log('\n---');
    console.log('Name:', a.name);
    console.log('Type:', a.activity_type);
    console.log('Has deep_dive:', !!a.deep_dive);
    console.log('Has kid_engagement:', !!a.kid_engagement);
    console.log('Has deep_dive_content:', !!a.deep_dive_content);
    if (a.deep_dive) {
      console.log('deep_dive keys:', Object.keys(a.deep_dive));
    }
  });
}
