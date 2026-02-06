import { test, expect } from "@playwright/test";

test("RV locations list badge styling", async ({ page }) => {
  // Login first
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*(?<!login)$/);

  // Go to RV locations
  await page.goto("http://localhost:3000/rv-locations");
  await page.waitForLoadState("networkidle");

  // Wait for location cards to load
  await page.waitForSelector('a[href^="/rv-locations/"]:not([href="/rv-locations/new"])', { timeout: 10000 });

  // Take a screenshot of the header area showing the Share button
  const header = page.locator('h1:has-text("RV Locations")').locator('..').locator('..');
  await header.screenshot({
    path: "e2e/screenshots/rv-list-header.png",
  });

  // Get the first location card and take a screenshot of just that element
  const firstCard = page.locator('a[href^="/rv-locations/"]:not([href="/rv-locations/new"])').first();
  await firstCard.screenshot({
    path: "e2e/screenshots/rv-list-card.png",
  });

  console.log("Screenshots saved to e2e/screenshots/");
});
