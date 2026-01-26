import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Check segment dates for Portugal 2026", async () => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Get all segments with dates
  const { data: segments, error } = await supabase
    .from("trip_segments")
    .select("segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("\n=== CURRENT SEGMENT DATES IN DATABASE ===\n");
  for (const seg of segments || []) {
    console.log(`#${seg.segment_number} ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
  }

  // Also check trip-level dates
  const { data: trip } = await supabase
    .from("trips")
    .select("name, start_date, end_date")
    .eq("id", tripId)
    .single();

  if (trip) {
    console.log(`\n=== TRIP DATES ===`);
    console.log(`${trip.name}: ${trip.start_date} to ${trip.end_date}`);
  }

  expect(segments?.length).toBeGreaterThan(0);
});
