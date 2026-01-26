import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("verify details page shows correct dates", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to Details page specifically
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set viewport
  await page.setViewportSize({ width: 1400, height: 900 });

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/details-page-dates.png", fullPage: true });

  // Check page content
  const pageContent = await page.textContent("body");
  console.log("\n=== CHECKING DETAILS PAGE ===");

  // Check for correct dates
  const hasMonJun15 = pageContent?.includes("Mon, Jun 15") || pageContent?.includes("Mon Jun 15");
  console.log(`Has Mon, Jun 15: ${hasMonJun15}`);

  // Check for wrong dates (should NOT have these)
  const hasSunJun14 = pageContent?.includes("Sun, Jun 14") || pageContent?.includes("Sun Jun 14");
  console.log(`Has wrong Sun, Jun 14: ${hasSunJun14}`);

  // The first day "Arrival & First Taste" should be Jun 15
  const arrivalText = await page.locator('text=/Arrival.*First.*Taste/').first().textContent().catch(() => null);
  console.log(`Arrival text: ${arrivalText}`);

  expect(hasMonJun15).toBe(true);
  expect(hasSunJun14).toBe(false);
});
