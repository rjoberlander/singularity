import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

test("Update segments from skeleton - preserve all data", async () => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Read skeleton file
  const skeletonContent = fs.readFileSync("/Users/richard/Downloads/portugal-summer-2026-trip-skeleton.json", "utf-8");
  const skeleton = JSON.parse(skeletonContent);

  console.log("\n========================================");
  console.log("UPDATING SEGMENTS FROM SKELETON");
  console.log("========================================\n");

  // Get current segments from DB
  const { data: dbSegments } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  // Update each segment's dates to match skeleton
  for (const skelSeg of skeleton.segments) {
    const dbSeg = dbSegments?.find(s => s.segment_number === skelSeg.segment_number);

    if (!dbSeg) {
      console.log(`⚠ Segment ${skelSeg.segment_number} not found in DB - skipping`);
      continue;
    }

    const needsUpdate = dbSeg.start_date !== skelSeg.start_date || dbSeg.end_date !== skelSeg.end_date;

    if (!needsUpdate) {
      console.log(`✓ Segment ${skelSeg.segment_number} (${skelSeg.name}): Already matches`);
      continue;
    }

    console.log(`Updating Segment ${skelSeg.segment_number} (${skelSeg.name}):`);
    console.log(`  FROM: ${dbSeg.start_date} to ${dbSeg.end_date}`);
    console.log(`  TO:   ${skelSeg.start_date} to ${skelSeg.end_date}`);

    // Update segment dates only - preserve all other data
    const { error } = await supabase
      .from("trip_segments")
      .update({
        start_date: skelSeg.start_date,
        end_date: skelSeg.end_date,
        // Also update other non-destructive fields from skeleton
        theme: skelSeg.theme,
        region: skelSeg.region,
      })
      .eq("id", dbSeg.id);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✓ Updated successfully`);

      // Count existing data that was preserved
      const { count: researchCount } = await supabase
        .from("trip_research_items")
        .select("*", { count: "exact", head: true })
        .eq("segment_id", dbSeg.id);

      const { count: activityCount } = await supabase
        .from("trip_activities")
        .select("*", { count: "exact", head: true })
        .eq("segment_id", dbSeg.id);

      const { count: dayCount } = await supabase
        .from("trip_days")
        .select("*", { count: "exact", head: true })
        .eq("segment_id", dbSeg.id);

      console.log(`  📊 Preserved: ${researchCount || 0} research items, ${activityCount || 0} activities, ${dayCount || 0} days`);
    }
    console.log("");
  }

  // Verify final state
  console.log("\n========================================");
  console.log("FINAL SEGMENT DATES");
  console.log("========================================\n");

  const { data: finalSegments } = await supabase
    .from("trip_segments")
    .select("segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  for (const seg of finalSegments || []) {
    const skelSeg = skeleton.segments.find((s: any) => s.segment_number === seg.segment_number);
    const matches = seg.start_date === skelSeg?.start_date && seg.end_date === skelSeg?.end_date;
    console.log(`#${seg.segment_number} ${seg.name}: ${seg.start_date} to ${seg.end_date} ${matches ? "✓" : "❌"}`);
  }

  expect(finalSegments?.length).toBe(skeleton.segments.length);
});
