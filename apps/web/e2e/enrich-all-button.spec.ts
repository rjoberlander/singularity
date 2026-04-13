import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("Enrich All button exists and enriches accommodations", async ({ page }) => {
  test.setTimeout(600_000); // 10 min — AI calls for 7 accommodations

  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/lodging`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Enrich All button should be visible
  const enrichAllBtn = page.getByTestId("enrich-all-button");
  await expect(enrichAllBtn).toBeVisible();
  console.log("Enrich All button found");

  // Count "Not enriched" warnings before
  const beforeNotEnriched = await page.locator("text=/Missing.*Not enriched/i").count();
  console.log(`Before: ${beforeNotEnriched} "Not enriched" warnings`);

  // Screenshot before
  await page.screenshot({ path: "e2e/screenshots/enrich-all-before.png", fullPage: true });

  // Click Enrich All
  await enrichAllBtn.click();

  // Should show progress indicator
  await page.waitForTimeout(2000);
  const progressText = await page.locator("text=/Enriching/i").first().textContent().catch(() => "");
  console.log(`Progress indicator: "${progressText}"`);

  // Wait for completion — watch for the button to stop showing "Enriching..."
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="enrich-all-button"]');
      return btn && !btn.textContent?.includes("Enriching");
    },
    { timeout: 540_000 },
  );
  console.log("Enrich All completed");

  // Wait for data refresh
  await page.waitForTimeout(2000);

  // Count "Not enriched" warnings after
  const afterNotEnriched = await page.locator("text=/Missing.*Not enriched/i").count();
  console.log(`After: ${afterNotEnriched} "Not enriched" warnings`);

  // Should have fewer "Not enriched" warnings than before
  expect(afterNotEnriched).toBeLessThan(beforeNotEnriched);

  // Screenshot after
  await page.screenshot({ path: "e2e/screenshots/enrich-all-after.png", fullPage: true });

  // Check that at least some accommodations now have parking/breakfast info
  const body = (await page.locator("body").innerText()).toLowerCase();
  const hasParking = (body.match(/parking/g) || []).length;
  const hasPool = (body.match(/pool/g) || []).length;
  console.log(`Parking mentions: ${hasParking}, Pool mentions: ${hasPool}`);
  expect(hasParking).toBeGreaterThan(1);
});
