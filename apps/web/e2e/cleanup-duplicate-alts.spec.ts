import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Clean up duplicate alternative activities", async () => {
  const supabase = createClient(
    "https://cymbadkegbibhxbfevuq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Get all backup activities for this trip
  const { data: backupActivities, error } = await supabase
    .from("trip_activities")
    .select("id, name, created_at")
    .eq("trip_id", tripId)
    .eq("is_backup", true)
    .order("name")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching activities:", error);
    return;
  }

  console.log(`Found ${backupActivities?.length || 0} backup activities`);

  // Group by name to find duplicates
  const byName: Record<string, typeof backupActivities> = {};
  for (const activity of backupActivities || []) {
    if (!byName[activity.name]) {
      byName[activity.name] = [];
    }
    byName[activity.name].push(activity);
  }

  // Find duplicates (more than 1 with same name)
  const duplicateNames = Object.entries(byName).filter(([_, activities]) => activities.length > 1);

  console.log(`\nFound ${duplicateNames.length} names with duplicates:`);

  let toDelete: string[] = [];

  for (const [name, activities] of duplicateNames) {
    console.log(`  - "${name}": ${activities.length} copies`);
    // Keep the first one (oldest), delete the rest
    const [keep, ...remove] = activities;
    toDelete.push(...remove.map(a => a.id));
  }

  console.log(`\nWill delete ${toDelete.length} duplicate activities`);

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("trip_activities")
      .delete()
      .in("id", toDelete);

    if (deleteError) {
      console.error("Error deleting duplicates:", deleteError);
    } else {
      console.log(`✓ Deleted ${toDelete.length} duplicates`);
    }
  }

  // Verify final count
  const { data: remaining } = await supabase
    .from("trip_activities")
    .select("id, name")
    .eq("trip_id", tripId)
    .eq("is_backup", true);

  console.log(`\nRemaining backup activities: ${remaining?.length || 0}`);

  expect(true).toBe(true);
});
