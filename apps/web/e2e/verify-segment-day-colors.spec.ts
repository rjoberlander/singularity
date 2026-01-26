import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("verify segment days show activity colors", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Capture API response to check data
  let tripData: any = null;
  page.on("response", async (response) => {
    if (response.url().includes(`/travel/trips/${TRIP_ID}/full`)) {
      try {
        tripData = await response.json();
      } catch {}
    }
  });

  // Go to Plan page
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set larger viewport
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.waitForTimeout(500);

  // Debug: Check activities data
  if (tripData?.data) {
    console.log("\n=== DATA ANALYSIS ===");
    console.log(`Days count: ${tripData.data.days?.length || 0}`);
    console.log(`Activities count: ${tripData.data.activities?.length || 0}`);

    // Check how activities are linked
    const activities = tripData.data.activities || [];
    let withDate = 0;
    let withDayId = 0;
    let withBoth = 0;
    let withNeither = 0;

    for (const act of activities) {
      if (act.date && act.day_id) withBoth++;
      else if (act.date) withDate++;
      else if (act.day_id) withDayId++;
      else withNeither++;
    }

    console.log(`\nActivity linking:`);
    console.log(`  With date only: ${withDate}`);
    console.log(`  With day_id only: ${withDayId}`);
    console.log(`  With both: ${withBoth}`);
    console.log(`  With neither: ${withNeither}`);

    // Sample first few activities
    console.log(`\nSample activities:`);
    for (const act of activities.slice(0, 5)) {
      console.log(`  - ${act.name}: date=${act.date || 'null'}, day_id=${act.day_id?.slice(0, 8) || 'null'}`);
    }

    // Check days
    console.log(`\nSample days:`);
    for (const day of (tripData.data.days || []).slice(0, 5)) {
      console.log(`  - ${day.date}: id=${day.id.slice(0, 8)}, segment_id=${day.segment_id?.slice(0, 8) || 'null'}`);
    }

    // Check segments
    console.log(`\nSegments:`);
    for (const seg of tripData.data.segments || []) {
      console.log(`  ${seg.segment_number}. ${seg.name}: ${seg.start_date} to ${seg.end_date}`);
    }
  }

  // Take full screenshot
  await page.screenshot({ path: "e2e/screenshots/segment-days-full.png", fullPage: true });

  // Find and screenshot the Segments section specifically
  const segmentsSection = page.locator('text=Segments').first().locator('xpath=ancestor::div[contains(@class, "rounded-lg") or contains(@class, "border")]').first();
  if (await segmentsSection.isVisible().catch(() => false)) {
    // Scroll to it
    await segmentsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await segmentsSection.screenshot({ path: "e2e/screenshots/segments-card.png" });
  }

  console.log("\nScreenshots saved!");
});
