import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("Day 1 and Day 2 maps after Hyatt coord fix", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const maps = page.getByTestId("day-route-map");
  const count = await maps.count();
  console.log(`Found ${count} day-route-map cards on Lisbon segment`);
  expect(count).toBeGreaterThanOrEqual(2);

  // Day 1 — wait for image, capture, also assert pin 1 coord is in Belém cluster
  const day1Map = maps.nth(0);
  await day1Map.scrollIntoViewIfNeeded();
  await day1Map.locator("img").first().evaluate((img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return;
    return new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      setTimeout(() => resolve(), 15_000);
    });
  });
  await day1Map.screenshot({ path: "e2e/screenshots/fix-day1-map.png" });
  const day1Src = await day1Map.locator("img").first().getAttribute("src");
  console.log(`Day 1 src: ${day1Src}`);

  // Day 2
  const day2Map = maps.nth(1);
  await day2Map.scrollIntoViewIfNeeded();
  await day2Map.locator("img").first().evaluate((img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return;
    return new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      setTimeout(() => resolve(), 15_000);
    });
  });
  await day2Map.screenshot({ path: "e2e/screenshots/fix-day2-map.png" });
  const day2Src = await day2Map.locator("img").first().getAttribute("src");
  console.log(`Day 2 src: ${day2Src}`);

  // Assert every label:1..N coordinate in Day 1 src is within the Belém bounding box
  // Belém bounding box (loose): lat 38.68..38.72, lng -9.22..-9.17
  const coordMatches = [...(day1Src || "").matchAll(/label%3A(\d+)%7C([\d.]+)%2C([-\d.]+)/g)];
  console.log(`Day 1 marker coords:`);
  for (const [, label, lat, lng] of coordMatches) {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const inBelem = la >= 38.68 && la <= 38.72 && ln >= -9.22 && ln <= -9.17;
    console.log(`  #${label}: ${la},${ln}  ${inBelem ? "OK (Belém)" : "OUT OF BELEM"}`);
  }
});
