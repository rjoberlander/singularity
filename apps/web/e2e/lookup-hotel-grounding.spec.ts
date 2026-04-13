import { test, expect, request } from "@playwright/test";

const APP_BASE = "http://localhost:3000";
const API_BASE = "http://localhost:3002/api/v1";
const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("lookup-hotel grounds LLM output via Google Places", async ({ page }) => {
  test.setTimeout(120_000);

  // Log in through the UI to get a Supabase session, then grab the bearer
  // token from the app so we can call the API directly.
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  // Intercept an authenticated call to capture the bearer token
  let token = "";
  await page.route(`${API_BASE}/**`, async (route) => {
    const headers = route.request().headers();
    if (headers["authorization"] && !token) {
      token = headers["authorization"].replace("Bearer ", "");
    }
    await route.continue();
  });
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  expect(token, "should have captured bearer token").toBeTruthy();

  // Call /lookup-hotel directly with a name we know the LLM hallucinates
  const api = await request.newContext();
  const resp = await api.post(`${API_BASE}/travel/trips/${TRIP_ID}/lookup-hotel`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    data: { query: "Hyatt Regency Lisbon" },
  });
  expect(resp.ok(), `lookup-hotel HTTP ${resp.status()}`).toBe(true);
  const body = await resp.json();
  console.log("lookup-hotel response:", JSON.stringify(body.data, null, 2));

  const hotel = body.data;
  expect(hotel, "response should have data").toBeTruthy();
  expect(hotel.grounded_by_google, "should be grounded by Google Places").toBe(true);
  expect(hotel.google_place_id, "should have place_id").toBeTruthy();

  // Belém bounding box
  expect(hotel.latitude).toBeGreaterThanOrEqual(38.68);
  expect(hotel.latitude).toBeLessThanOrEqual(38.72);
  expect(hotel.longitude).toBeGreaterThanOrEqual(-9.22);
  expect(hotel.longitude).toBeLessThanOrEqual(-9.17);

  // Address should reference Junqueira (the real Hyatt street), not Rua do Açúcar
  expect(hotel.address).toMatch(/Junqueira/i);
  expect(hotel.address).not.toMatch(/Açúcar/i);
});
