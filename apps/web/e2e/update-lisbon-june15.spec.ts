import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Update Lisbon to June 15-18", async () => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Update Lisbon (segment 1) - start June 15, end June 18
  const { error } = await supabase
    .from("trip_segments")
    .update({
      start_date: "2026-06-15",
      end_date: "2026-06-18",
    })
    .eq("trip_id", tripId)
    .eq("segment_number", 1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("✓ Updated Lisbon to June 15-18");
  }

  // Verify
  const { data: segments } = await supabase
    .from("trip_segments")
    .select("segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  console.log("\nCurrent segment dates:");
  for (const seg of segments || []) {
    console.log(`#${seg.segment_number} ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
  }

  expect(segments?.find(s => s.segment_number === 1)?.start_date).toBe("2026-06-15");
});
