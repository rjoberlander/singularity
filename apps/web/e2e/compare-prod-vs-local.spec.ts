import { test } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

async function login(page: any, base: string) {
  await page.goto(`${base}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 45_000 });
}

test("screenshot prod browse page", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "https://singularity.boo");
  await page.goto(`https://singularity.boo/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const mapCount = await page.getByTestId("day-route-map").count();
  console.log(`PROD day-route-map count: ${mapCount}`);

  // Top of page
  await page.screenshot({ path: "e2e/screenshots/prod-browse-top.png", fullPage: false });
  // Scroll to where a map should appear if deployed
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e/screenshots/prod-browse-scrolled.png", fullPage: false });
  // Full page so you can see the whole Day 1
  await page.screenshot({ path: "e2e/screenshots/prod-browse-full.png", fullPage: true });
});

test("screenshot localhost browse page", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "http://localhost:3000");
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const mapCount = await page.getByTestId("day-route-map").count();
  console.log(`LOCAL day-route-map count: ${mapCount}`);

  await page.screenshot({ path: "e2e/screenshots/local-browse-top.png", fullPage: false });
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e/screenshots/local-browse-scrolled.png", fullPage: false });
});
