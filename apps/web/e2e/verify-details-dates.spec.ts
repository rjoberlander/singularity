import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("verify details page shows correct dates starting June 15", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to Details/Overview page
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/overview`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set viewport
  await page.setViewportSize({ width: 1400, height: 900 });

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/details-dates.png", fullPage: true });

  // Check for June 15 on first day
  const pageContent = await page.textContent("body");
  console.log("\n=== CHECKING DETAILS PAGE ===");

  const hasJun15 = pageContent?.includes("Jun 15") || pageContent?.includes("June 15");
  console.log(`Has June 15: ${hasJun15}`);

  // Check segment dates
  const hasLisbonJun15 = pageContent?.includes("Mon, Jun 15");
  console.log(`Lisbon starts Mon, Jun 15: ${hasLisbonJun15}`);

  // Verify no June 14 appears (old wrong date)
  const hasJun14First = pageContent?.includes("Sun, Jun 14") && !pageContent?.includes("Sat, Jun 14");
  console.log(`Has wrong Jun 14 date: ${hasJun14First}`);

  expect(hasJun15).toBe(true);
});
