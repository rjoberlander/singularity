import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("Check badges display", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('#email', "rjoberlander@gmail.com");
  await page.fill('#password', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });

  // Test with an activity WITHOUT Google data
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details?day=day1&activity=arrive-lisbon-airport`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.setViewportSize({ width: 1600, height: 1200 });

  // Get page text
  const pageText = await page.locator('body').textContent();
  console.log("Has 'Google' text:", pageText?.includes('Google'));
  console.log("Has 'Photos' text:", pageText?.includes('Photos'));
  console.log("Has 'Maps' text:", pageText?.includes('Maps'));
  console.log("Has 'Status:' text:", pageText?.includes('Status:'));

  // Check specifically for our new badges
  const hasGoogleText = await page.locator('text=Google').count();
  console.log("Google text occurrences:", hasGoogleText);

  const hasMapsText = await page.locator('text=Maps').count();
  console.log("Maps text occurrences:", hasMapsText);

  const hasPhotosText = await page.locator('text=/\\d+ Photos/').count();
  console.log("Photos badge occurrences:", hasPhotosText);

  const hasNoGoogleData = await page.locator('text=No Google Data').count();
  console.log("No Google Data occurrences:", hasNoGoogleData);

  await page.screenshot({ path: "e2e/screenshots/test-badges.png", fullPage: true });
});
