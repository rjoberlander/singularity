import { test, expect } from "@playwright/test";

test("Settings Usage tab shows API usage", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });

  // Navigate to settings
  await page.goto("http://localhost:3000/settings");
  await page.waitForLoadState("networkidle");

  // Click on Usage tab
  const usageTab = page.locator('button[role="tab"]:has-text("Usage")');
  await expect(usageTab).toBeVisible({ timeout: 10000 });
  await usageTab.click();

  // Wait for usage content to load
  await page.waitForTimeout(2000);

  // Take screenshot of usage tab
  await page.screenshot({ path: "e2e/screenshots/settings-usage.png", fullPage: true });

  // Verify key elements are visible
  const googlePhotosSection = page.locator('text=Google Places Photos');
  await expect(googlePhotosSection).toBeVisible({ timeout: 5000 });

  // Check for module breakdown (use more specific selectors)
  const rvSection = page.locator('.font-medium.text-sm:has-text("RV Locations")');
  const travelSection = page.locator('.font-medium.text-sm:has-text("Travel")');

  if (await rvSection.isVisible()) {
    console.log("RV Locations usage section visible");
  }
  if (await travelSection.isVisible()) {
    console.log("Travel usage section visible");
  }

  // Check for total cost
  const totalCost = page.locator('text=Estimated Total Cost');
  await expect(totalCost).toBeVisible({ timeout: 5000 });
  console.log("Total cost section visible");
});
