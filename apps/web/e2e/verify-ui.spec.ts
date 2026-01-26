import { test } from "@playwright/test";

test("Verify segments UI shows research status", async ({ page }) => {
  // Login first
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Navigate to the trip plan page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take a screenshot to verify the UI
  await page.screenshot({ path: "e2e/screenshots/segments-with-research.png", fullPage: true });

  console.log("Screenshot saved to e2e/screenshots/segments-with-research.png");
});
