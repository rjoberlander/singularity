import { test, expect } from "@playwright/test";

test("Debug usage data", async ({ page, request }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });

  // Get auth token from localStorage/cookies
  const cookies = await page.context().cookies();
  console.log("Cookies:", cookies.map(c => c.name));

  // Navigate to usage and capture network
  page.on('response', async response => {
    if (response.url().includes('api-usage') || response.url().includes('users')) {
      const body = await response.text().catch(() => 'could not read');
      console.log('API Response:', response.url(), response.status(), body.substring(0, 500));
    }
  });

  await page.goto("http://localhost:3000/usage");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/usage-debug.png", fullPage: true });

  // Check what the page shows
  const photoCount = await page.locator('text=/\\d+ \\/ 1,000 used/').textContent().catch(() => 'not found');
  console.log("Photo usage text:", photoCount);

  const rvCount = await page.locator('.font-medium.text-sm:has-text("RV Locations") + div + div').textContent().catch(() => 'not found');
  console.log("RV photos:", rvCount);
});
