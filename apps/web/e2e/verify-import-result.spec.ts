import { test } from "@playwright/test";

test("Verify import result on Overview page", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to Overview page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/overview");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/overview-with-activities.png", fullPage: true });
  console.log("Overview screenshot saved");

  // Click "Show Details" on Lisbon segment
  const showDetails = page.locator('button:has-text("Show Details")').first();
  if (await showDetails.isVisible()) {
    await showDetails.click();
    await page.waitForTimeout(1000);
  }

  // Take screenshot with details expanded
  await page.screenshot({ path: "e2e/screenshots/overview-lisbon-expanded.png", fullPage: true });
  console.log("Expanded screenshot saved");

  // Also check plan page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "e2e/screenshots/plan-after-import.png", fullPage: true });
  console.log("Plan page screenshot saved");
});
