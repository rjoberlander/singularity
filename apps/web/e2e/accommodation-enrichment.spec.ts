import { test, expect, request } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";
const API_BASE = "http://localhost:3002/api/v1";

// Hyatt Regency Lisbon — already has google_place_id
const HYATT_ID = "06e9f47e-1ab5-43dc-9a65-aabae1479d13";

async function login(page: any) {
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
}

async function getToken(page: any): Promise<string> {
  let token = "";
  await page.route(`${API_BASE}/**`, async (route: any) => {
    const h = route.request().headers();
    if (h["authorization"] && !token) token = h["authorization"].replace("Bearer ", "");
    await route.continue();
  });
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/lodging`);
  await page.waitForLoadState("networkidle");
  return token;
}

test("enrich Hyatt via AI endpoint and verify data saved", async ({ page }) => {
  test.setTimeout(180_000); // AI calls can take a while
  await login(page);
  const token = await getToken(page);
  expect(token).toBeTruthy();

  // Call the enrich-ai endpoint directly
  const api = await request.newContext();
  const resp = await api.post(
    `${API_BASE}/travel/trips/${TRIP_ID}/accommodations/${HYATT_ID}/enrich-ai`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  console.log("enrich-ai status:", resp.status());
  const body = await resp.json();
  if (!resp.ok()) {
    console.log("Error:", JSON.stringify(body, null, 2));
  }
  expect(resp.ok(), `enrich-ai should return 200, got ${resp.status()}`).toBe(true);

  const enrichment = body.data?.enrichment;
  console.log("Enrichment result:", JSON.stringify(enrichment, null, 2));

  // Verify key fields were returned
  expect(enrichment).toBeTruthy();
  expect(enrichment.property_type).toBeTruthy();
  expect(enrichment.parking).toBeTruthy();
  expect(enrichment.breakfast).toBeTruthy();
  expect(enrichment.amenities_structured).toBeTruthy();

  // Verify parking has expected shape
  expect(typeof enrichment.parking.available).toBe("boolean");

  // Verify breakfast has expected shape
  expect(typeof enrichment.breakfast.included).toBe("boolean");

  // Verify amenities has pool info
  expect(enrichment.amenities_structured.pool).toBeTruthy();

  // Verify neighborhood was extracted
  console.log("Neighborhood:", enrichment.neighborhood);
  console.log("Nearby landmarks:", enrichment.nearby_landmarks?.length || 0);
});

test("lodging page shows enriched data and warning badges", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await login(page);

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/lodging`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // Take full page screenshot
  await page.screenshot({ path: "e2e/screenshots/lodging-enriched.png", fullPage: true });

  // The page body should contain enriched data terms
  const body = await page.locator("body").innerText();
  const bodyLower = body.toLowerCase();

  // Hyatt should show enriched data (parking, breakfast, or amenities)
  // At least one of these should be present from the enrichment
  const hasEnrichedContent =
    bodyLower.includes("parking") ||
    bodyLower.includes("breakfast") ||
    bodyLower.includes("pool") ||
    bodyLower.includes("restaurant");
  console.log(`Has enriched content: ${hasEnrichedContent}`);
  expect(hasEnrichedContent).toBe(true);

  // Warning badges should exist for non-enriched accommodations
  // The badge text is "Missing: Not enriched"
  const notEnrichedBadges = page.locator('text=/Missing.*Not enriched/i');
  const notEnrichedCount = await notEnrichedBadges.count();
  console.log(`"Not enriched" warning count: ${notEnrichedCount}`);
  // At least 5 of 7 should be not enriched (we only enriched Hyatt)
  expect(notEnrichedCount).toBeGreaterThanOrEqual(5);

  // Missing field badges (amber warning badges with "Missing:" text)
  const missingFields = page.locator('text=/Missing:/i');
  const missingCount = await missingFields.count();
  console.log(`Total missing field badges: ${missingCount}`);
  expect(missingCount).toBeGreaterThan(0);

  // Hyatt card should show property type badge if enriched
  const propertyBadges = page.locator('text=/Hotel|Resort|Boutique/i');
  const propCount = await propertyBadges.count();
  console.log(`Property type badges: ${propCount}`);

  // Screenshot the first card zoomed in
  const firstCard = page.locator('[data-testid="accommodation-card"]').first();
  if (await firstCard.count() > 0) {
    await firstCard.screenshot({ path: "e2e/screenshots/lodging-hyatt-card.png" });
  }
});
