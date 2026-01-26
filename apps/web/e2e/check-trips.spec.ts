import { test } from "@playwright/test";

test("Check available trips", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to travel page to see trips
  await page.goto("http://localhost:3000/travel");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/trips-list.png", fullPage: true });
  console.log("Screenshot saved");

  // List trips from page
  const trips = page.locator('a[href^="/travel/"]');
  const count = await trips.count();
  console.log(`Found ${count} trips`);

  for (let i = 0; i < Math.min(count, 10); i++) {
    const href = await trips.nth(i).getAttribute("href");
    const text = await trips.nth(i).textContent();
    console.log(`Trip ${i + 1}: ${href} - ${text?.trim().slice(0, 50)}`);
  }
});
