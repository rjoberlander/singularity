import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

async function login(page: any) {
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
}

test("lodging page shows all 7 accommodations", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1400 });
  await login(page);
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/lodging`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Collect all visible accommodation names from the page body
  const body = (await page.locator("body").innerText()).toLowerCase();
  const expected = [
    "hyatt regency lisbon",
    "beautiful sea-view apartment",
    "vila galé évora",
    "nature cottage",
    "ramada house",
    "authentic porto apartments",
    "holiday inn express lisbon airport",
  ];
  const missing: string[] = [];
  for (const e of expected) {
    if (!body.includes(e)) missing.push(e);
  }
  console.log(`Missing on lodging page: ${missing.length === 0 ? "none" : missing.join(", ")}`);
  await page.screenshot({ path: "e2e/screenshots/lodging-all-7.png", fullPage: true });
  expect(missing).toEqual([]);
});

test("Lisbon has zero pool activities and day maps still render", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Should be on Lisbon tab by default (index 0)
  const bodyText = (await page.locator('[data-testid="browse-page"]').innerText()).toLowerCase();
  const poolMentions = (bodyText.match(/\bpool\b/g) || []).length;
  console.log(`Occurrences of "pool" on Lisbon segment: ${poolMentions}`);
  // Some non-pool-activity text might still mention the word (e.g., hotel amenities) so we
  // assert no "Pool time" card specifically
  expect(bodyText).not.toContain("pool time");
  expect(bodyText).not.toContain("final pool time");

  // Day maps still render
  const maps = page.getByTestId("day-route-map");
  const count = await maps.count();
  console.log(`Lisbon day-route-map count: ${count}`);
  expect(count).toBeGreaterThan(0);

  // First map image loads
  const firstImg = maps.first().locator("img").first();
  await maps.first().scrollIntoViewIfNeeded();
  const ok = await firstImg.evaluate((img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return true;
    return new Promise<boolean>((resolve) => {
      img.addEventListener("load", () => resolve(img.naturalWidth > 0), { once: true });
      setTimeout(() => resolve(false), 15_000);
    });
  });
  expect(ok).toBe(true);
});
