import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Check segment 6 data after import", async () => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Get segment 6
  const { data: segment } = await supabase
    .from("trip_segments")
    .select("id, name, research_status, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 6)
    .single();

  console.log("\n=== SEGMENT 6 ===");
  console.log(`Name: ${segment?.name}`);
  console.log(`Dates: ${segment?.start_date} to ${segment?.end_date}`);
  console.log(`Research status: ${segment?.research_status}`);

  // Get days for segment 6
  const { data: days } = await supabase
    .from("trip_days")
    .select("id, day_number, date")
    .eq("segment_id", segment?.id)
    .order("day_number");

  console.log(`\n=== DAYS (${days?.length || 0}) ===`);
  for (const day of days || []) {
    console.log(`  Day ${day.day_number}: ${day.date} (id: ${day.id})`);
  }

  // Get activities for segment 6
  const { data: activities } = await supabase
    .from("trip_activities")
    .select("id, name, date, day_id, activity_type, segment_id")
    .eq("segment_id", segment?.id)
    .order("date");

  console.log(`\n=== ACTIVITIES (${activities?.length || 0}) ===`);
  for (const act of activities || []) {
    console.log(`  ${act.name}`);
    console.log(`    - date: ${act.date}`);
    console.log(`    - day_id: ${act.day_id}`);
    console.log(`    - activity_type: ${act.activity_type}`);
  }

  // Get research items for segment 6
  const { data: researchItems } = await supabase
    .from("trip_research_items")
    .select("id, name, item_type")
    .eq("segment_id", segment?.id);

  console.log(`\n=== RESEARCH ITEMS (${researchItems?.length || 0}) ===`);
  for (const item of researchItems?.slice(0, 5) || []) {
    console.log(`  - ${item.name} (${item.item_type})`);
  }

  // Check if activities have day_id populated
  const activitiesWithDayId = activities?.filter(a => a.day_id) || [];
  const activitiesWithDate = activities?.filter(a => a.date) || [];

  console.log(`\n=== ACTIVITY LINKAGE ===`);
  console.log(`Activities with day_id: ${activitiesWithDayId.length}`);
  console.log(`Activities with date: ${activitiesWithDate.length}`);

  // Verify day dates match expected dates
  console.log(`\n=== DATE VERIFICATION ===`);
  const expectedDates = ["2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12", "2026-07-13"];
  for (const day of days || []) {
    const matches = expectedDates.includes(day.date);
    console.log(`  Day ${day.day_number}: ${day.date} ${matches ? "✓" : "❌"}`);
  }

  console.log("\n=== CHECK COMPLETE ===");
});
