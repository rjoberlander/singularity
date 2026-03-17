import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Verify days have trip_id set correctly", async () => {
  const supabase = createClient(
    "https://cymbadkegbibhxbfevuq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Get segment 6
  const { data: segment6 } = await supabase
    .from("trip_segments")
    .select("id, name")
    .eq("trip_id", tripId)
    .eq("segment_number", 6)
    .single();

  console.log(`\nSegment 6 ID: ${segment6?.id}`);

  // Get days for segment 6 - check both trip_id and segment_id
  const { data: days } = await supabase
    .from("trip_days")
    .select("id, day_number, date, trip_id, segment_id")
    .eq("segment_id", segment6?.id)
    .order("day_number");

  console.log(`\n=== DAYS FOR SEGMENT 6 (via segment_id) ===`);
  console.log(`Found ${days?.length || 0} days`);
  for (const day of days || []) {
    console.log(`  Day ${day.day_number}: ${day.date}`);
    console.log(`    trip_id: ${day.trip_id}`);
    console.log(`    segment_id: ${day.segment_id}`);
  }

  // Check if days are accessible by trip_id
  const { data: daysByTripId } = await supabase
    .from("trip_days")
    .select("id, date, segment_id")
    .eq("trip_id", tripId)
    .order("date");

  console.log(`\n=== ALL DAYS FOR TRIP (via trip_id) ===`);
  console.log(`Found ${daysByTripId?.length || 0} days total`);

  // Count days per segment
  const segmentCounts: Record<string, number> = {};
  for (const day of daysByTripId || []) {
    const sid = day.segment_id || 'no_segment';
    segmentCounts[sid] = (segmentCounts[sid] || 0) + 1;
  }

  console.log(`\nDays per segment:`);
  for (const [sid, count] of Object.entries(segmentCounts)) {
    console.log(`  ${sid}: ${count} days`);
  }

  // Check if segment 6 days are in the trip_id query results
  const segment6DayIds = new Set(days?.map(d => d.id) || []);
  const segment6DaysInTripQuery = daysByTripId?.filter(d => segment6DayIds.has(d.id)) || [];
  console.log(`\nSegment 6 days found in trip_id query: ${segment6DaysInTripQuery.length}`);

  // Check activities
  const { data: activities } = await supabase
    .from("trip_activities")
    .select("id, name, trip_id, day_id")
    .eq("segment_id", segment6?.id)
    .limit(10);

  console.log(`\n=== SAMPLE ACTIVITIES FOR SEGMENT 6 ===`);
  for (const act of activities || []) {
    console.log(`  ${act.name}`);
    console.log(`    trip_id: ${act.trip_id}`);
    console.log(`    day_id: ${act.day_id}`);
  }

  console.log("\n=== VERIFICATION COMPLETE ===");
});
