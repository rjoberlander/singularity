import { test, expect } from "@playwright/test";

test("prod browse page loads with activities", async ({ page }) => {
  test.setTimeout(90_000);

  // Login
  await page.goto("https://singularity.boo/login");
  await page.fill('input[type="email"], input[placeholder*="@"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in"), button[type="submit"]');
  await page.waitForURL(/dashboard|travel/, { timeout: 30000 });
  console.log("Logged in:", page.url());

  // Navigate to browse
  await page.goto(
    "https://singularity.boo/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/browse",
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(8000);
  console.log("Browse URL:", page.url());

  const bodyText = await page.locator("body").innerText().catch(() => "");
  console.log("Body length:", bodyText.length);
  console.log("First 500:", bodyText.slice(0, 500));

  // Check for content indicators
  const hasSegment = bodyText.includes("Segment") || bodyText.includes("Day ");
  const hasActivity = bodyText.length > 200;
  console.log("Has segment/day header:", hasSegment);
  console.log("Has substantial content:", hasActivity);

  await page.screenshot({ path: "apps/web/e2e/screenshots/prod-browse-live.png", fullPage: true });
  expect(hasActivity).toBe(true);
});
