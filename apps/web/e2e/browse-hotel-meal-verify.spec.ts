import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const API_BASE = "http://localhost:3002/api/v1";
const APP_BASE = "http://localhost:3000";

test("verify hotel check-in photos and meal restaurant names", async ({ page }) => {
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Capture auth token
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  let capturedToken = "";
  const captureHandler = async (route: any) => {
    const headers = route.request().headers();
    if (headers["authorization"]) capturedToken = headers["authorization"].replace("Bearer ", "");
    await route.continue();
  };
  await page.route(`${API_BASE}/**`, captureHandler);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.unroute(`${API_BASE}/**`, captureHandler);

  // Enrich accommodations + check data
  if (capturedToken) {
    const res = await page.request.get(`${API_BASE}/travel/trips/${TRIP_ID}/full`, {
      headers: { Authorization: `Bearer ${capturedToken}` },
    });
    if (res.ok()) {
      const data = (await res.json()).data;
      const accommodations = data.accommodations || [];
      const media = data.media || [];
      console.log(`\n=== Data check ===`);
      console.log(`Accommodations: ${accommodations.length}`);
      accommodations.forEach((a: any) => {
        console.log(`  ${a.name} (segment: ${a.segment_id?.substring(0, 8)})`);
      });

      let accommMedia = media.filter((m: any) => m.parent_type === "accommodation");
      console.log(`Accommodation photos before enrichment: ${accommMedia.length}`);

      // Enrich accommodations that have no photos
      for (const accomm of accommodations) {
        const photos = accommMedia.filter((m: any) => m.parent_id === accomm.id);
        if (photos.length === 0) {
          console.log(`  Enriching: ${accomm.name}`);
          try {
            const enrichRes = await page.request.post(
              `${API_BASE}/travel/trips/${TRIP_ID}/accommodations/${accomm.id}/fetch-google`,
              { headers: { Authorization: `Bearer ${capturedToken}` }, timeout: 30000 }
            );
            if (enrichRes.ok()) {
              const result = await enrichRes.json();
              console.log(`    → ${JSON.stringify(result).substring(0, 200)}`);
            } else {
              console.log(`    → Failed: ${enrichRes.status()}`);
            }
          } catch (e: any) {
            console.log(`    → Error: ${e.message?.substring(0, 80)}`);
          }
        }
      }

      // Re-fetch to check photos
      const res2 = await page.request.get(`${API_BASE}/travel/trips/${TRIP_ID}/full`, {
        headers: { Authorization: `Bearer ${capturedToken}` },
      });
      if (res2.ok()) {
        const data2 = (await res2.json()).data;
        accommMedia = (data2.media || []).filter((m: any) => m.parent_type === "accommodation");
        console.log(`Accommodation photos after enrichment: ${accommMedia.length}`);
      }
      accommMedia.forEach((m: any) => {
        console.log(`  ${m.parent_id?.substring(0, 8)} — ${m.file_url?.substring(0, 60)}`);
      });

      // Find the Lisbon segment
      const lisbonSeg = data.segments?.find((s: any) => /lisbon/i.test(s.name));
      if (lisbonSeg) {
        const lisbonAccomm = accommodations.find((a: any) => a.segment_id === lisbonSeg.id);
        console.log(`\nLisbon accommodation: ${lisbonAccomm?.name || "NONE"} (id: ${lisbonAccomm?.id?.substring(0, 8)})`);
        const lisbonAccommPhotos = accommMedia.filter((m: any) => m.parent_id === lisbonAccomm?.id);
        console.log(`Lisbon accommodation photos: ${lisbonAccommPhotos.length}`);
      }

      // Check check-in activity
      const checkinAct = data.activities?.find((a: any) => /hyatt.*check/i.test(a.name));
      if (checkinAct) {
        console.log(`\nCheck-in activity: ${checkinAct.name}`);
        console.log(`  type: ${checkinAct.activity_type}, sub_type: ${checkinAct.activity_sub_type}`);
        console.log(`  location_name: ${checkinAct.location_name}`);
        const actMedia = media.filter((m: any) => m.parent_id === checkinAct.id);
        console.log(`  Own photos: ${actMedia.length}`);
      }
    }
  }

  // Reload to pick up enrichment
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Check hotel check-in card for photos
  const hyattCard = page.locator('[data-testid="browse-activity-card"]').filter({
    has: page.locator('h3:has-text("Hyatt")'),
  }).first();

  if (await hyattCard.isVisible({ timeout: 3000 })) {
    const hasPhotos = await hyattCard.locator('[data-testid="activity-photos"]').count();
    console.log(`\nHyatt check-in card has photos: ${hasPhotos > 0 ? "YES" : "NO"}`);
    await hyattCard.scrollIntoViewIfNeeded();
    await hyattCard.screenshot({ path: "e2e/screenshots/browse-hyatt-checkin.png" });
  }

  // 2. Check meal cards
  const mealCards = page.locator('[data-testid="browse-activity-card"]').filter({
    has: page.locator('text=/Lunch|Dinner/i'),
  });
  const mealCount = await mealCards.count();
  console.log(`\nMeal cards: ${mealCount}`);
  for (let i = 0; i < Math.min(4, mealCount); i++) {
    const card = mealCards.nth(i);
    const title = await card.locator('h3').first().textContent();
    const hasRating = await card.locator('svg.lucide-star').count();
    console.log(`  ${i + 1}: title="${title}", rating=${hasRating > 0}`);
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: `e2e/screenshots/browse-meal-${i + 1}.png` });
  }
});
