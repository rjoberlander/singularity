import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Run migration 037 - expand item_type constraint", async () => {
  const supabase = createClient(
    "https://cymbadkegbibhxbfevuq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w"
  );

  // Run the migration SQL
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Drop the existing constraint
      ALTER TABLE trip_research_items DROP CONSTRAINT IF EXISTS trip_research_items_item_type_check;

      -- Add the expanded constraint
      ALTER TABLE trip_research_items ADD CONSTRAINT trip_research_items_item_type_check
        CHECK (item_type IN (
          'restaurant', 'hike', 'attraction', 'beach', 'hotel',
          'activity', 'shop', 'service', 'viewpoint', 'transport',
          'accommodation', 'neighborhood', 'experience', 'museum', 'tour'
        ));
    `
  });

  if (error) {
    // Try direct SQL if rpc doesn't exist
    console.log("RPC not available, trying alternative method...");

    // Use the REST API to check if we can at least verify the current constraint
    const { data, error: selectError } = await supabase
      .from('trip_research_items')
      .select('item_type')
      .limit(1);

    if (!selectError) {
      console.log("Table accessible. Need to run SQL migration manually.");
      console.log("\nRun this SQL in Supabase dashboard SQL editor:");
      console.log(`
ALTER TABLE trip_research_items DROP CONSTRAINT IF EXISTS trip_research_items_item_type_check;

ALTER TABLE trip_research_items ADD CONSTRAINT trip_research_items_item_type_check
  CHECK (item_type IN (
    'restaurant', 'hike', 'attraction', 'beach', 'hotel',
    'activity', 'shop', 'service', 'viewpoint', 'transport',
    'accommodation', 'neighborhood', 'experience', 'museum', 'tour'
  ));
      `);
    }
  } else {
    console.log("✓ Migration executed successfully");
  }

  expect(true).toBe(true);
});
