import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Fix Lisbon segment dates to correct values", async () => {
  const supabase = createClient(
    "https://cymbadkegbibhxbfevuq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // The correct segment dates for Portugal Summer 2026:
  // Trip: June 14 - July 14
  // Segment 1 (Lisbon): June 14-18 (5 days)
  // Segment 2 (Alentejo): June 19-24 (6 days)
  // Segment 3 (Sagres/Lagos): June 24-26 (3 days)
  // etc.

  console.log("\n=== BEFORE FIX ===");

  // Get current state
  const { data: segmentsBefore } = await supabase
    .from("trip_segments")
    .select("segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  for (const seg of segmentsBefore || []) {
    console.log(`#${seg.segment_number} ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
  }

  // Fix Lisbon (segment 1) to correct dates: June 14-18
  const { error: lisbonError } = await supabase
    .from("trip_segments")
    .update({
      start_date: "2026-06-14",
      end_date: "2026-06-18",
    })
    .eq("trip_id", tripId)
    .eq("segment_number", 1);

  if (lisbonError) {
    console.error("Error fixing Lisbon:", lisbonError);
  } else {
    console.log("\n✓ Fixed Lisbon dates to June 14-18");
  }

  console.log("\n=== AFTER FIX ===");

  // Verify
  const { data: segmentsAfter } = await supabase
    .from("trip_segments")
    .select("segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  for (const seg of segmentsAfter || []) {
    console.log(`#${seg.segment_number} ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
  }

  expect(segmentsAfter?.find(s => s.segment_number === 1)?.start_date).toBe("2026-06-14");
});
