import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("Check meal details render on browse page", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Search for researched restaurant names in the page
  const bodyText = await page.locator("body").innerText();

  const restaurants = [
    "Alina's Bica", "Casa Chico Zé", "Don Sebastião", "Casinha do Petisco",
    "Adega da Marina", "Picnic", "Pastelaria Algarve", "A Forja",
  ];

  console.log("\n=== RESTAURANT VISIBILITY ON BROWSE ===");
  let found = 0;
  for (const r of restaurants) {
    const visible = bodyText.includes(r);
    console.log(`  ${visible ? "✓" : "✗"} ${r}`);
    if (visible) found++;
  }
  console.log(`\n${found}/${restaurants.length} Sagres restaurants visible on browse page`);

  // Check for restaurant detail fields
  const detailKeywords = ["signature_dishes", "local_insight", "cuisine_type", "cataplana", "bifana", "caldeirada"];
  console.log("\n=== DETAIL KEYWORDS ===");
  for (const kw of detailKeywords) {
    console.log(`  ${bodyText.toLowerCase().includes(kw.toLowerCase()) ? "✓" : "✗"} ${kw}`);
  }

  await page.screenshot({ path: "e2e/screenshots/browse-meals.png", fullPage: true });
});
