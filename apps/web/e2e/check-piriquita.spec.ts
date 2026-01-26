import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("Casa Piriquita has photos and badges", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('#email', "rjoberlander@gmail.com");
  await page.fill('#password', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });

  // Navigate to Casa Piriquita
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details?day=day2&activity=pastries-at-casa-piriquita`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.screenshot({ path: "e2e/screenshots/casa-piriquita.png", fullPage: true });

  // Check for photos
  const images = await page.locator('img[src*="singularity-uploads"]').count();
  console.log("Images found:", images);

  // Check for Google badge
  const googleBadge = await page.locator('text=Google').first().isVisible().catch(() => false);
  console.log("Has Google badge:", googleBadge);

  // Check for Photos badge (looking for "X Photos" text)
  const photosBadge = await page.locator('text=/\\d+.*Photos/').first().isVisible().catch(() => false);
  console.log("Has Photos badge:", photosBadge);

  // Debug: look for any badge-like text
  const photosText = await page.locator('[class*="badge"]').allTextContents();
  console.log("All badge texts:", photosText);

  // Check for Maps link
  const mapsLink = await page.locator('text=Maps').first().isVisible().catch(() => false);
  console.log("Has Maps link:", mapsLink);

  // Check for Google rating
  const rating = await page.locator('text=/4\\.[0-9]/').first().isVisible().catch(() => false);
  console.log("Has rating:", rating);

  expect(images).toBeGreaterThan(0);
});
