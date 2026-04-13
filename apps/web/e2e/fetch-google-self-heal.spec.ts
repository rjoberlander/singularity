import { test, expect, request } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load API .env so we have SERVICE_ROLE key for this test
dotenv.config({ path: path.resolve(__dirname, "../../api/.env") });

const APP_BASE = "http://localhost:3000";
const API_BASE = "http://localhost:3002/api/v1";
const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const HYATT_ID = "06e9f47e-1ab5-43dc-9a65-aabae1479d13";

test("fetch-google self-heals wrong lat/lng on existing accommodation", async ({ page }) => {
  test.setTimeout(180_000);
  const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Step 1: snapshot current (correct) state
  const { data: before } = await supa
    .from("trip_accommodations")
    .select("latitude,longitude,address")
    .eq("id", HYATT_ID)
    .single();
  expect(before).toBeTruthy();
  console.log("Before corruption:", before);
  expect(before!.latitude).toBeGreaterThanOrEqual(38.68);

  // Step 2: corrupt it to the old hallucinated values (Parque das Nações)
  const BAD_LAT = 38.7678;
  const BAD_LNG = -9.0938;
  const BAD_ADDR = "Rua do Açúcar, 58, 1950-007 Lisbon, Portugal";
  const { error: corruptErr } = await supa
    .from("trip_accommodations")
    .update({ latitude: BAD_LAT, longitude: BAD_LNG, address: BAD_ADDR, photos_fetched: false })
    .eq("id", HYATT_ID);
  expect(corruptErr).toBeNull();
  console.log(`Corrupted to ${BAD_LAT},${BAD_LNG} / ${BAD_ADDR}`);

  // Step 3: log in and capture bearer token
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  let token = "";
  await page.route(`${API_BASE}/**`, async (route) => {
    const h = route.request().headers();
    if (h["authorization"] && !token) token = h["authorization"].replace("Bearer ", "");
    await route.continue();
  });
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  expect(token).toBeTruthy();

  // Step 4: call /accommodations/:id/fetch-google
  const api = await request.newContext();
  const resp = await api.post(
    `${API_BASE}/travel/trips/${TRIP_ID}/accommodations/${HYATT_ID}/fetch-google`,
    {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    },
  );
  console.log("fetch-google status:", resp.status());
  const body = await resp.json();
  if (!resp.ok()) console.log("Error body:", JSON.stringify(body, null, 2));
  expect(resp.ok()).toBe(true);

  // Step 5: read the row back and verify Google's values overwrote the corrupted ones
  const { data: after } = await supa
    .from("trip_accommodations")
    .select("latitude,longitude,address,google_place_id")
    .eq("id", HYATT_ID)
    .single();
  console.log("After fetch-google:", after);

  expect(after!.latitude, "lat must be in Belém, not Parque das Nações").toBeGreaterThanOrEqual(
    38.68,
  );
  expect(after!.latitude).toBeLessThanOrEqual(38.72);
  expect(after!.longitude).toBeGreaterThanOrEqual(-9.22);
  expect(after!.longitude).toBeLessThanOrEqual(-9.17);
  expect(after!.address).toMatch(/Junqueira/i);
  expect(after!.address).not.toMatch(/Açúcar/i);
  expect(after!.google_place_id).toBeTruthy();
});
