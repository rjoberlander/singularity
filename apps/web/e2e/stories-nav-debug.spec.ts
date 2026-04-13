import { test } from "@playwright/test";

test("Stories - day card with overview + timeline + map", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15000 });

  await page.goto(
    "http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/stories"
  );
  await page.waitForTimeout(3000);

  const phoneFrame = page.locator('.rounded-\\[3rem\\]');

  // Navigate: Title → About City → Your Trip → Accommodation → Day 1
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(1200);
  }

  // Day 1 slide 1: overview
  await phoneFrame.screenshot({ path: "apps/web/e2e/screenshots/stories-day-final-s1.png" });

  // Auto-advance to timeline
  await page.waitForTimeout(3500);
  await phoneFrame.screenshot({ path: "apps/web/e2e/screenshots/stories-day-final-s2.png" });

  // Auto-advance to map
  await page.waitForTimeout(3500);
  await phoneFrame.screenshot({ path: "apps/web/e2e/screenshots/stories-day-final-s3.png" });
});
