import { test, expect } from "@playwright/test";

test("Verify API usage data displays correctly", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });

  // Navigate to usage page
  await page.goto("http://localhost:3000/usage");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Verify the page loaded with usage data
  await expect(page.locator('h1:has-text("API Usage")')).toBeVisible();

  // Verify photo usage is displayed (should show X / 1,000 used)
  const photoUsageText = page.locator('text=/\\d+ \\/ 1,000 used/');
  await expect(photoUsageText).toBeVisible();

  // Verify we have some actual usage (not zeros)
  const photoText = await photoUsageText.textContent();
  expect(photoText).not.toBe("0 / 1,000 used");

  // Verify estimated cost section exists
  await expect(page.locator('text="Estimated Total Cost"')).toBeVisible();

  // Take verification screenshot
  await page.screenshot({ path: "e2e/screenshots/usage-verified.png", fullPage: true });
});
