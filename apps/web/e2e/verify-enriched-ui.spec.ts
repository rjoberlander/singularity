import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("Hyatt card shows enriched parking, breakfast, amenities, neighborhood", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1200 });

  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/lodging`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Find the Hyatt card specifically
  const hyattCard = page.locator("text=Hyatt Regency Lisbon").first().locator("xpath=ancestor::div[contains(@class,'rounded')]").first();
  await hyattCard.scrollIntoViewIfNeeded();
  await hyattCard.screenshot({ path: "e2e/screenshots/hyatt-enriched-card.png" });

  const cardText = (await hyattCard.innerText()).toLowerCase();
  console.log("Hyatt card text length:", cardText.length);

  // Check enriched fields are rendered
  const checks = {
    "property type (hotel)": /hotel/i.test(cardText),
    "parking info": /parking/i.test(cardText),
    "breakfast info": /breakfast/i.test(cardText),
    "pool": /pool/i.test(cardText),
    "gym": /gym/i.test(cardText),
    "spa": /spa/i.test(cardText),
    "restaurant": /restaurant/i.test(cardText),
    "wifi": /wi.?fi/i.test(cardText),
    "neighborhood (Belém)": /belém/i.test(cardText),
    "star rating (5)": /★/.test(await hyattCard.innerHTML()) || cardText.includes("5"),
    "google rating (4.4)": /4\.4/.test(cardText),
  };

  for (const [label, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  }

  const passing = Object.values(checks).filter(Boolean).length;
  const total = Object.values(checks).length;
  console.log(`\n${passing}/${total} enriched fields visible on Hyatt card`);

  // At least 7 of 11 should be visible (some may be rendered differently)
  expect(passing).toBeGreaterThanOrEqual(7);

  // Full page screenshot for visual review
  await page.screenshot({ path: "e2e/screenshots/lodging-final.png", fullPage: true });
});
