import { test, expect } from "@playwright/test";

test("Check general alternatives via UI", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Go to details page
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Get trip data via page context
  const tripData = await page.evaluate(async (tripId) => {
    // Try to fetch directly
    const res = await fetch(`/api/travel/${tripId}?full=true`);
    if (res.ok) return res.json();
    return null;
  }, tripId);

  if (tripData?.activities) {
    const backupActivities = tripData.activities.filter((a: any) => a.is_backup);
    const generalAlts = backupActivities.filter((a: any) => !a.alternate_to_activity_id);

    console.log("\n=== BACKUP ACTIVITIES FROM API ===");
    console.log(`Total backup activities: ${backupActivities.length}`);
    console.log(`General alternatives (no link): ${generalAlts.length}`);
    console.log("\nGeneral alternatives:");
    generalAlts.forEach((a: any) => {
      console.log(`  - ${a.name} (segment_id: ${a.segment_id})`);
    });

    // Check for Lagos Tourist Train
    const lagosTrain = generalAlts.find((a: any) => a.name?.includes("Lagos Tourist Train"));
    console.log(`\nLagos Tourist Train as activity: ${lagosTrain ? 'YES' : 'NO'}`);
  } else {
    console.log("Could not get trip data from API");
  }

  // Check what segments have segment_alternatives JSONB
  if (tripData?.segments) {
    console.log("\n=== SEGMENT ALTERNATIVES (JSONB) ===");
    for (const seg of tripData.segments) {
      const segAlts = seg.segment_alternatives || [];
      if (segAlts.length > 0) {
        console.log(`\nSegment ${seg.destination}: ${segAlts.length} JSONB alternatives`);
        segAlts.forEach((a: any) => console.log(`  - ${a.name}`));
      }
    }
  }

  expect(tripData).toBeTruthy();
});
