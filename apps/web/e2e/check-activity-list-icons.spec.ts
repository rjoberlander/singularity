import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("Activity list shows status icons", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('#email', "rjoberlander@gmail.com");
  await page.fill('#password', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });

  // Navigate to trip details
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.setViewportSize({ width: 1600, height: 1000 });

  // Expand segment to see activities
  const segment = page.locator('text=Sintra\'s Fairy-Tale Palaces').first();
  if (await segment.isVisible()) {
    await segment.dblclick();
    await page.waitForTimeout(500);
  }

  // Check for icons in the activity list (left sidebar)
  // Look for the activity "Pastries at Casa Piriquita"
  const activityRow = page.locator('text=Pastries at Casa Piriquita').first();
  const isVisible = await activityRow.isVisible().catch(() => false);
  console.log("Activity row visible:", isVisible);

  // Check for green checkmark (Google data) next to activities
  const checkIcons = await page.locator('[class*="text-green-500"] svg').count();
  console.log("Green checkmarks (Google data):", checkIcons);

  // Check for yellow stars (rating) in the list
  const starIcons = await page.locator('[class*="text-yellow-500"] svg').count();
  console.log("Yellow stars (rating):", starIcons);

  // Check for blue external link icons (maps)
  const mapsIcons = await page.locator('[class*="text-blue-500"] svg').count();
  console.log("Blue icons (maps/alternatives):", mapsIcons);

  // Check for image icons with counts
  const imageIcons = await page.locator('[class*="text-muted-foreground"]').filter({ has: page.locator('svg') }).count();
  console.log("Image icons:", imageIcons);

  await page.screenshot({ path: "e2e/screenshots/activity-list-icons.png", fullPage: true });

  // Verify we have some Google data indicators
  expect(checkIcons).toBeGreaterThan(0);
});
