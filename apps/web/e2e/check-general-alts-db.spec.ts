import { test, expect } from "@playwright/test";

test("Check general alternatives in database", async ({ request }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Direct supabase query
  const supabaseUrl = "http://127.0.0.1:54321/rest/v1";
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

  const activitiesResponse = await request.get(
    `${supabaseUrl}/trip_activities?trip_id=eq.${tripId}&is_backup=eq.true&select=id,name,alternate_to_activity_id,alternative_type,segment_id`,
    {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    }
  );

  const activities = await activitiesResponse.json();

  console.log("\n=== BACKUP ACTIVITIES ===");
  console.log(`Total backup activities: ${activities.length}`);

  const linked = activities.filter((a: any) => a.alternate_to_activity_id);
  const general = activities.filter((a: any) => !a.alternate_to_activity_id);

  console.log(`\nLinked alternatives (with alternate_to_activity_id): ${linked.length}`);
  linked.forEach((a: any) => console.log(`  - ${a.name}`));

  console.log(`\nGeneral alternatives (without alternate_to_activity_id): ${general.length}`);
  general.forEach((a: any) => console.log(`  - ${a.name} (segment: ${a.segment_id})`));

  // Check for specific ones
  const lagosTrain = activities.find((a: any) => a.name?.includes("Lagos Tourist Train"));
  const lagosZoo = activities.find((a: any) => a.name?.includes("Lagos Zoo"));

  console.log("\n=== SPECIFIC CHECKS ===");
  console.log(`Lagos Tourist Train exists as activity: ${lagosTrain ? 'YES' : 'NO'}`);
  console.log(`Lagos Zoo exists as activity: ${lagosZoo ? 'YES' : 'NO'}`);

  expect(activities.length).toBeGreaterThan(0);
});
