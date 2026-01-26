import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const SKELETON_PATH = "/Users/richard/Downloads/portugal-summer-2026-trip-skeleton.json";

test("import skeleton and verify days are synced correctly", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to Plan page
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set viewport
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Find the skeleton file input and upload
  const fileInput = page.locator('input[type="file"][accept=".json"]').first();
  await fileInput.setInputFiles(SKELETON_PATH);

  // Wait for dialog to appear
  await page.waitForTimeout(1000);

  // Look for and click the Import button
  const importButton = page.locator('button:has-text("Import Segments")');
  if (await importButton.isVisible({ timeout: 3000 })) {
    await importButton.click();
    console.log("Clicked Import Segments button");

    // Wait for import to complete
    await page.waitForTimeout(5000);
  }

  // Take screenshot after import
  await page.screenshot({ path: "e2e/screenshots/after-skeleton-sync.png", fullPage: true });

  // Capture API response to verify data
  let tripData: any = null;
  page.on("response", async (response) => {
    if (response.url().includes(`/travel/trips/${TRIP_ID}/full`)) {
      try {
        tripData = await response.json();
      } catch {}
    }
  });

  // Refresh to get fresh data
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Log the data
  if (tripData?.data) {
    console.log("\n=== AFTER SYNC - TRIP DATA ===");
    console.log(`Trip start_date: ${tripData.data.start_date}`);
    console.log(`Trip end_date: ${tripData.data.end_date}`);

    console.log("\n=== SEGMENTS ===");
    for (const seg of tripData.data.segments || []) {
      console.log(`  ${seg.segment_number}. ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
    }

    console.log("\n=== DAYS ===");
    const lisbonSegment = tripData.data.segments?.find((s: any) => s.name === "Lisbon");
    if (lisbonSegment) {
      const lisbonDays = (tripData.data.days || []).filter((d: any) => d.segment_id === lisbonSegment.id);
      console.log(`Lisbon segment ID: ${lisbonSegment.id}`);
      console.log(`Lisbon days count: ${lisbonDays.length}`);
      for (const day of lisbonDays.slice(0, 10)) {
        console.log(`  Day ${day.day_number}: ${day.date} - ${day.title}`);
      }

      // Verify first day matches segment start
      if (lisbonDays.length > 0) {
        const firstDayDate = lisbonDays[0].date?.split('T')[0];
        const segmentStartDate = lisbonSegment.start_date?.split('T')[0];
        console.log(`\nFirst day date: ${firstDayDate}`);
        console.log(`Segment start: ${segmentStartDate}`);
        console.log(`Match: ${firstDayDate === segmentStartDate ? 'YES' : 'NO - MISMATCH!'}`);
      }
    }

    console.log("\n=== ACTIVITIES (first 5) ===");
    const activities = tripData.data.activities || [];
    for (const act of activities.slice(0, 5)) {
      const day = tripData.data.days?.find((d: any) => d.id === act.day_id);
      console.log(`  ${act.name}: day_id=${act.day_id?.slice(0, 8)}, day_date=${day?.date || 'not found'}`);
    }
  }

  // Final screenshot
  await page.screenshot({ path: "e2e/screenshots/after-sync-final.png", fullPage: true });
});
