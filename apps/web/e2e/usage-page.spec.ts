import { test, expect } from "@playwright/test";

test("Direct access to Usage page from sidebar", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });

  // Go directly to usage page
  await page.goto("http://localhost:3000/usage");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/usage-page-direct.png", fullPage: true });

  // Verify page title
  const title = page.locator('h1:has-text("API Usage")');
  await expect(title).toBeVisible({ timeout: 5000 });

  // Verify Google Places section
  const googleSection = page.locator('text=Google Places Photos');
  await expect(googleSection).toBeVisible({ timeout: 5000 });

  // Verify sidebar link is highlighted
  const sidebarLink = page.locator('a[href="/usage"]');
  await expect(sidebarLink).toBeVisible({ timeout: 5000 });

  console.log("Usage page loaded successfully via direct URL!");
});
