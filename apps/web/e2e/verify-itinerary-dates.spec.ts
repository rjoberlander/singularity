import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("verify itinerary shows correct dates starting June 15", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to Itinerary page
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/itinerary`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set viewport
  await page.setViewportSize({ width: 1400, height: 900 });

  // Take screenshot of itinerary
  await page.screenshot({ path: "e2e/screenshots/itinerary-dates.png", fullPage: true });

  // Check for June 15 in the page text
  const pageContent = await page.textContent("body");
  console.log("\n=== CHECKING ITINERARY ===");

  // Check if Jun 15 is present
  const hasJun15 = pageContent?.includes("Jun 15") || pageContent?.includes("June 15");
  console.log(`Has June 15: ${hasJun15}`);

  // Check what the first day title shows
  const firstDayTitle = await page.locator('text=/Arrival.*First Taste/i').first().textContent().catch(() => null);
  console.log(`First day title: ${firstDayTitle}`);

  // Look for segment header dates
  const lisbonHeader = await page.locator('text=/Lisbon.*Jun/i').first().textContent().catch(() => null);
  console.log(`Lisbon header: ${lisbonHeader}`);

  console.log("\nScreenshot saved to e2e/screenshots/itinerary-dates.png");
});
