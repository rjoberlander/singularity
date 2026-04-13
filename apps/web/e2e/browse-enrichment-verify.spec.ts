import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const API_BASE = "http://localhost:3002/api/v1";
const APP_BASE = "http://localhost:3000";

test("enrich all segments and verify browse page", async ({ page }) => {
  test.setTimeout(600_000); // 10 min for enrichment of all segments

  // Login
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Navigate to browse page first — this loads the app and makes authenticated calls
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Intercept API calls to capture the auth token
  let capturedToken = "";
  const captureHandler = async (route: any) => {
    const headers = route.request().headers();
    if (headers["authorization"]) {
      capturedToken = headers["authorization"].replace("Bearer ", "");
    }
    await route.continue();
  };
  await page.route(`${API_BASE}/**`, captureHandler);

  // Trigger a navigation to capture the token
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Remove the interceptor so it doesn't interfere with our API calls
  await page.unroute(`${API_BASE}/**`, captureHandler);

  // If we still don't have a token, try extracting from Supabase cookie
  if (!capturedToken) {
    const cookies = await page.context().cookies();
    for (const c of cookies) {
      if (c.name.includes("auth-token")) {
        try {
          const val = decodeURIComponent(c.value);
          // Supabase stores base64-encoded JSON
          if (val.startsWith("base64-")) {
            const decoded = Buffer.from(val.slice(7), "base64").toString();
            const parsed = JSON.parse(decoded);
            capturedToken = parsed.access_token || "";
          } else {
            const parsed = JSON.parse(val);
            capturedToken = parsed.access_token || "";
          }
        } catch { /* try next */ }
      }
    }
  }

  console.log(`Auth token: ${capturedToken ? "captured (" + capturedToken.substring(0, 20) + "...)" : "NOT FOUND"}`);

  // If no token, skip enrichment and just verify the page
  if (capturedToken) {
    const apiHeaders = { Authorization: `Bearer ${capturedToken}` };

    // Fetch trip data to check current state
    const tripRes = await page.request.get(`${API_BASE}/travel/trips/${TRIP_ID}/full`, {
      headers: apiHeaders,
    });

    if (tripRes.ok()) {
      const tripJson = await tripRes.json();
      const tripData = tripJson.data || tripJson;
      const segments = tripData.segments || [];
      const activities = tripData.activities || [];
      console.log(`Trip: ${segments.length} segments, ${activities.length} activities`);

      // Check unenriched meals with specific venues
      const genericMealPatterns = [/^breakfast$/i, /^lunch$/i, /^dinner$/i];
      const unenrichedMeals = activities.filter((a: any) =>
        !a.google_place_id
        && genericMealPatterns.some((p: RegExp) => p.test(a.name))
        && a.location_name
        && !/^(hotel|accommodation|resort)\b/i.test(a.location_name.trim())
      );
      console.log(`Unenriched meals with specific venues: ${unenrichedMeals.length}`);
      unenrichedMeals.forEach((a: any) => {
        console.log(`  ${a.name} at "${a.location_name}"`);
      });

      // Check lat/lng coverage
      const withCoords = activities.filter((a: any) => a.latitude && a.longitude);
      console.log(`Activities with lat/lng: ${withCoords.length}/${activities.length}`);

      // Enrich each segment
      console.log(`\n=== Enriching segments ===`);
      for (const segment of segments) {
        console.log(`Enriching: ${segment.name}`);
        try {
          const enrichRes = await page.request.post(
            `${API_BASE}/travel/trips/${TRIP_ID}/segments/${segment.id}/enrich-activities`,
            { headers: apiHeaders, timeout: 120000 }
          );
          if (enrichRes.ok()) {
            const result = await enrichRes.json();
            console.log(`  → ${JSON.stringify(result).substring(0, 200)}`);
          } else {
            console.log(`  → Failed: ${enrichRes.status()}`);
          }
        } catch (e: any) {
          console.log(`  → Timeout/error: ${e.message?.substring(0, 80)}`);
        }
      }

      // Re-fetch to verify enrichment
      const tripRes2 = await page.request.get(`${API_BASE}/travel/trips/${TRIP_ID}/full`, {
        headers: apiHeaders,
      });
      if (tripRes2.ok()) {
        const tripJson2 = await tripRes2.json();
        const tripData2 = tripJson2.data || tripJson2;
        const activities2 = tripData2.activities || [];
        const enriched2 = activities2.filter((a: any) => a.google_place_id);
        const withCoords2 = activities2.filter((a: any) => a.latitude && a.longitude);
        console.log(`\nPost-enrichment: ${enriched2.length}/${activities2.length} enriched, ${withCoords2.length} with coords`);
      }
    } else {
      console.log(`Trip fetch failed: ${tripRes.status()}`);
    }
  } else {
    console.log("Skipping enrichment - no auth token available");
  }

  // Reload browse page to pick up enrichment
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.setViewportSize({ width: 1920, height: 1200 });

  // === PAGE VERIFICATION ===
  console.log(`\n=== Browse page verification ===`);

  // Transport bars
  const transportCount = await page.locator('[data-testid="transport-bar"]').count();
  console.log(`Transport bars: ${transportCount}`);
  expect(transportCount).toBeGreaterThan(0);

  // Activity time ranges (with duration inline)
  const timeRanges = page.locator('[data-testid="activity-time-range"]');
  const timeRangeCount = await timeRanges.count();
  console.log(`Activity time ranges: ${timeRangeCount}`);
  expect(timeRangeCount).toBeGreaterThan(0);

  // Log time pill texts to verify duration is inline
  for (let i = 0; i < Math.min(5, timeRangeCount); i++) {
    const text = await timeRanges.nth(i).textContent();
    console.log(`  Time pill ${i + 1}: "${text}"`);
  }

  // Day time ranges
  console.log(`Day time ranges: ${await page.locator('[data-testid="day-time-range"]').count()}`);

  // Travel hints
  const travelHints = page.locator('[data-testid="travel-hint"]');
  const travelHintCount = await travelHints.count();
  console.log(`Travel hints: ${travelHintCount}`);
  for (let i = 0; i < Math.min(5, travelHintCount); i++) {
    console.log(`  Hint ${i + 1}: "${await travelHints.nth(i).textContent()}"`);
  }

  // Star ratings
  const starCards = page.locator('[data-testid="browse-activity-card"]').filter({
    has: page.locator('svg.lucide-star'),
  });
  console.log(`Cards with star ratings: ${await starCards.count()}`);

  // Screenshot
  await page.screenshot({
    path: "e2e/screenshots/browse-enriched-1.png",
    fullPage: true,
  });

  // Navigate through segments
  for (let i = 1; i < 5; i++) {
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
    if (await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
      const hints = await page.locator('[data-testid="travel-hint"]').count();
      const bars = await page.locator('[data-testid="transport-bar"]').count();
      console.log(`\nSegment ${i + 1}: ${bars} transport bars, ${hints} travel hints`);
      await page.screenshot({
        path: `e2e/screenshots/browse-enriched-${i + 1}.png`,
        fullPage: true,
      });
    } else {
      break;
    }
  }

  console.log("\n=== All verifications complete ===");
});
