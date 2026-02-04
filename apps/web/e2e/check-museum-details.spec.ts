import { test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Check Vilarinho das Furnas Museum activity details", async () => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Find the Vilarinho museum activity
  const { data: activities } = await supabase
    .from("trip_activities")
    .select("*")
    .eq("trip_id", tripId)
    .ilike("name", "%Vilarinho%");

  console.log(`\n=== VILARINHO MUSEUM ACTIVITIES (${activities?.length || 0}) ===`);

  for (const act of activities || []) {
    console.log(`\nActivity: ${act.name}`);
    console.log(`  ID: ${act.id}`);
    console.log(`  activity_type: ${act.activity_type}`);
    console.log(`  day_id: ${act.day_id}`);
    console.log(`  segment_id: ${act.segment_id}`);
    console.log(`  is_backup: ${act.is_backup}`);
    console.log(`  description: ${act.description?.substring(0, 100) || "NONE"}...`);
    console.log(`  why_its_great: ${act.why_its_great?.substring(0, 100) || "NONE"}...`);
    console.log(`  location_name: ${act.location_name || "NONE"}`);
    console.log(`  address: ${act.address || "NONE"}`);
    console.log(`  latitude: ${act.latitude || "NONE"}`);
    console.log(`  longitude: ${act.longitude || "NONE"}`);
    console.log(`  duration_minutes: ${act.duration_minutes || "NONE"}`);
    console.log(`  cost_estimate: ${act.cost_estimate || "NONE"}`);
    console.log(`  website: ${act.website || "NONE"}`);
    console.log(`  tips: ${act.tips?.substring(0, 100) || "NONE"}...`);
    console.log(`  activity_details keys: ${act.activity_details ? Object.keys(act.activity_details).join(", ") : "NONE"}`);

    // Check if activity_details has deep_dive, kid_engagement, etc.
    if (act.activity_details) {
      console.log(`\n  activity_details content:`);
      console.log(`    deep_dive: ${act.activity_details.deep_dive ? "YES" : "NO"}`);
      console.log(`    kid_engagement: ${act.activity_details.kid_engagement ? "YES" : "NO"}`);
      console.log(`    photo_spots: ${act.activity_details.photo_spots ? "YES" : "NO"}`);
      console.log(`    practical: ${act.activity_details.practical ? "YES" : "NO"}`);
    }
  }

  // Also check research items for the museum
  const { data: researchItems } = await supabase
    .from("trip_research_items")
    .select("*")
    .eq("trip_id", tripId)
    .ilike("name", "%Vilarinho%");

  console.log(`\n=== VILARINHO RESEARCH ITEMS (${researchItems?.length || 0}) ===`);

  for (const item of researchItems || []) {
    console.log(`\nResearch Item: ${item.name}`);
    console.log(`  ID: ${item.id}`);
    console.log(`  item_type: ${item.item_type}`);
    console.log(`  segment_id: ${item.segment_id}`);
    console.log(`  priority: ${item.priority}`);
    console.log(`  why_relevant: ${item.why_relevant?.substring(0, 100) || "NONE"}...`);
    console.log(`  deep_dive keys: ${item.deep_dive ? Object.keys(item.deep_dive).join(", ") : "NONE"}`);
    console.log(`  kid_engagement keys: ${item.kid_engagement ? Object.keys(item.kid_engagement).join(", ") : "NONE"}`);
    console.log(`  practical keys: ${item.practical ? Object.keys(item.practical).join(", ") : "NONE"}`);
    console.log(`  location keys: ${item.location ? Object.keys(item.location).join(", ") : "NONE"}`);

    if (item.deep_dive) {
      console.log(`\n  deep_dive content:`);
      console.log(`    what_it_is: ${item.deep_dive.what_it_is?.substring(0, 100) || "NONE"}...`);
      console.log(`    the_story: ${item.deep_dive.the_story ? "YES" : "NO"}`);
      console.log(`    interesting_facts: ${item.deep_dive.interesting_facts?.length || 0} items`);
    }
  }

  console.log("\n=== CHECK COMPLETE ===");
});
