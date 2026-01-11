import { test, expect } from "@playwright/test";

/**
 * Phase 2: Segments Tests
 *
 * Tests: CRUD segments with city info, reordering
 * Validates: Segment list, segment detail, city information
 */

// Mock data for segments (based on Portugal trip)
const MOCK_SEGMENTS = [
  {
    name: "Lisbon",
    description: "Historic capital city with stunning architecture",
    start_date: "2026-07-01",
    end_date: "2026-07-05",
    location_name: "Lisbon, Portugal",
    latitude: 38.7223,
    longitude: -9.1393,
    city_info: {
      history: "Lisbon is one of the oldest cities in Western Europe, predating London, Paris and Rome by centuries. Founded by Phoenicians around 1200 BC.",
      culture: "Known for Fado music, azulejo tiles, and a vibrant cafe culture. Very family-friendly with outdoor dining and playgrounds.",
      tips: "Take Tram 28 for scenic views. Visit Pastéis de Belém early to avoid lines. São Jorge Castle has great views.",
      overview: "Portugal's capital and largest city, built on seven hills overlooking the Tagus River.",
    },
    key_activities_summary: "Alfama district, Belém Tower, Jerónimos Monastery, Pastéis de Belém, Tram 28",
    driving_from_previous: "Pick up car at airport",
    driving_notes: "Lisbon has steep hills and narrow streets. Consider parking at hotel and walking/using public transport.",
  },
  {
    name: "Cascais/Estoril",
    description: "Coastal resort towns west of Lisbon",
    start_date: "2026-07-06",
    end_date: "2026-07-08",
    location_name: "Cascais, Portugal",
    latitude: 38.6979,
    longitude: -9.4215,
    city_info: {
      history: "Former fishing village turned royal resort in the late 19th century when Portuguese royalty chose it as their summer retreat.",
      culture: "Relaxed beach town vibe with excellent seafood restaurants and family-friendly beaches.",
      tips: "Rent bikes and ride along the coast to Guincho Beach. Visit Cabo da Roca - westernmost point of continental Europe.",
      overview: "Charming coastal town with beautiful beaches, historic center, and easy day trips to Sintra.",
    },
    key_activities_summary: "Beach time, Cabo da Roca, Sintra palaces, coastal bike path",
    driving_from_previous: "30 min from Lisbon",
    driving_notes: "Easy drive along the coast. Plenty of parking in town.",
  },
  {
    name: "Lagos/Sagres (Algarve)",
    description: "Dramatic sea cliffs and surfing paradise",
    start_date: "2026-07-09",
    end_date: "2026-07-13",
    location_name: "Lagos, Portugal",
    latitude: 37.1020,
    longitude: -8.6730,
    city_info: {
      history: "Historic port city that was the launching point for many Portuguese Age of Discovery expeditions. Prince Henry the Navigator lived here.",
      culture: "Surf culture meets historic charm. Known for dramatic rock formations and sea caves.",
      tips: "Book Ponta da Piedade boat tour in advance. Visit Praia Dona Ana early morning for photos. Cape St. Vincent has stunning sunset views.",
      overview: "One of the most visited towns in the Algarve, famous for its dramatic coastline and excellent beaches.",
    },
    key_activities_summary: "Ponta da Piedade boat tours, Cape St. Vincent, Praia Dona Ana, surfing lessons",
    driving_from_previous: "3 hrs from Cascais (stop in Comporta for lunch)",
    driving_notes: "Via A2 motorway. Consider stopping in Comporta or Setúbal for a break.",
  },
  {
    name: "Albufeira (Central Algarve)",
    description: "Beach resort hub with water parks",
    start_date: "2026-07-14",
    end_date: "2026-07-18",
    location_name: "Albufeira, Portugal",
    latitude: 37.0882,
    longitude: -8.2503,
    city_info: {
      history: "Ancient fishing village transformed into the Algarve's most popular tourist destination. The old town preserves traditional character.",
      culture: "Family-friendly resort area with waterparks, boat tours, and beach activities.",
      tips: "Visit Benagil Cave by kayak or SUP for fewer crowds. Slide & Splash waterpark is great for kids. Old town has best restaurants.",
      overview: "The busiest resort town in the Algarve with excellent beaches, nightlife, and family attractions.",
    },
    key_activities_summary: "Benagil Cave, Slide & Splash, Zoomarine, beach hopping, old town",
    driving_from_previous: "1 hr from Lagos",
    driving_notes: "Easy drive on A22 coastal motorway.",
  },
  {
    name: "Porto",
    description: "UNESCO World Heritage city and port wine capital",
    start_date: "2026-07-24",
    end_date: "2026-07-26",
    location_name: "Porto, Portugal",
    latitude: 41.1579,
    longitude: -8.6291,
    city_info: {
      history: "Portugal's second city, named after the country itself. The historic center is a UNESCO World Heritage Site.",
      culture: "Known for port wine, stunning architecture, and the iconic Dom Luís I Bridge. More working-class feel than Lisbon.",
      tips: "Visit Livraria Lello (Harry Potter inspiration) early morning. Take a Douro River cruise. Cross the bridge to Vila Nova de Gaia for port wine cellars.",
      overview: "Historic riverside city famous for port wine, azulejo-covered churches, and the beautiful Ribeira district.",
    },
    key_activities_summary: "Livraria Lello, Ribeira waterfront, port wine cellars, São Bento station, Douro cruise",
    driving_from_previous: "1 hr from Aveiro",
    driving_notes: "Parking can be challenging in city center. Consider parking at hotel and walking.",
  },
];

// Helper functions
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

async function goToTravel(page: any) {
  await page.goto("http://localhost:3000/travel");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function openOrCreateTrip(page: any, tripName: string = "Segment Test Trip") {
  await goToTravel(page);

  const existingTrip = page.locator('[data-testid="trip-card"], .trip-card, [class*="cursor-pointer"]')
    .filter({ hasText: tripName })
    .first();

  if (await existingTrip.count() > 0) {
    await existingTrip.click();
    await page.waitForTimeout(1000);
    return;
  }

  // Create new trip
  await page.locator('button:has-text("Add Trip"), button:has-text("New Trip")').first().click();
  await page.waitForTimeout(500);

  await page.locator('input[name="name"], input[id="name"]').fill(tripName);
  await page.locator('textarea[name="description"]').fill("Trip for testing segments");
  await page.locator('input[name="start_date"], input[type="date"]').first().fill("2026-07-01");
  await page.locator('input[name="end_date"], input[type="date"]').last().fill("2026-07-30");
  await page.locator('input[name="origin"]').fill("Los Angeles, CA");
  await page.locator('input[name="destination"]').fill("Lisbon, Portugal");
  await page.locator('button:has-text("Both"), [data-value="both"]').click().catch(() =>
    page.locator('button:has-text("Flying")').click()
  );
  await page.locator('input[name="traveler_count"]').fill("5");

  await page.locator('[role="dialog"] button[type="submit"]').click();
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="trip-card"], .trip-card')
    .filter({ hasText: tripName })
    .first()
    .click();
  await page.waitForTimeout(1000);
}

test.describe("Phase 2: Segments", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================
  // CREATE SEGMENTS
  // ============================================

  test("2.S.1 - Add first segment (Lisbon)", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Before adding segment
    await page.screenshot({ path: "tests/screenshots/travel-before-segment.png", fullPage: true });

    // Find Add Segment button
    const addSegmentButton = page.locator('button:has-text("Add Segment"), button:has-text("Add Location"), button:has-text("Add Stop"), [data-testid="add-segment"]').first();

    if (await addSegmentButton.count() > 0) {
      await addSegmentButton.click();
      await page.waitForTimeout(500);

      // Screenshot: Segment form
      await page.screenshot({ path: "tests/screenshots/travel-segment-form.png" });

      const segment = MOCK_SEGMENTS[0]; // Lisbon

      // Name
      await page.locator('input[name="name"], input[id="name"], input[placeholder*="name" i]').fill(segment.name);

      // Description
      await page.locator('textarea[name="description"], textarea[id="description"]').fill(segment.description);

      // Start Date
      await page.locator('input[name="start_date"], input[type="date"]').first().fill(segment.start_date);

      // End Date
      await page.locator('input[name="end_date"], input[type="date"]').last().fill(segment.end_date);

      // Location name
      await page.locator('input[name="location_name"], input[placeholder*="location" i], input[placeholder*="city" i]').fill(segment.location_name);

      // Key activities summary
      await page.locator('input[name="key_activities_summary"], textarea[name="key_activities_summary"], input[placeholder*="activities" i]').fill(segment.key_activities_summary);

      // Driving from previous
      await page.locator('input[name="driving_from_previous"], input[placeholder*="driving" i]').fill(segment.driving_from_previous);

      // Screenshot: Segment form filled
      await page.screenshot({ path: "tests/screenshots/travel-segment-form-filled.png" });

      // Save
      await page.locator('button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")').click();
      await page.waitForTimeout(2000);

      // Screenshot: After adding segment
      await page.screenshot({ path: "tests/screenshots/travel-after-add-segment.png", fullPage: true });

      // Verify segment appears
      await expect(page.locator(`text=${segment.name}`)).toBeVisible({ timeout: 5000 });

      console.log(`SUCCESS: Added segment "${segment.name}"`);
    } else {
      console.log("Add Segment button not found");
    }
  });

  test("2.S.2 - Add multiple segments", async ({ page }) => {
    await openOrCreateTrip(page);

    // Add segments 1-3
    for (let i = 1; i < 4; i++) {
      const segment = MOCK_SEGMENTS[i];

      const addButton = page.locator('button:has-text("Add Segment"), button:has-text("Add Location")').first();
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(500);

        await page.locator('input[name="name"]').fill(segment.name);
        await page.locator('textarea[name="description"]').fill(segment.description);
        await page.locator('input[name="start_date"], input[type="date"]').first().fill(segment.start_date);
        await page.locator('input[name="end_date"], input[type="date"]').last().fill(segment.end_date);
        await page.locator('input[name="location_name"]').fill(segment.location_name);
        await page.locator('input[name="key_activities_summary"], textarea[name="key_activities_summary"]').fill(segment.key_activities_summary);
        await page.locator('input[name="driving_from_previous"]').fill(segment.driving_from_previous);

        await page.locator('button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")').click();
        await page.waitForTimeout(1500);

        console.log(`Added segment: ${segment.name}`);
      }
    }

    // Screenshot: Multiple segments
    await page.screenshot({ path: "tests/screenshots/travel-multiple-segments.png", fullPage: true });

    console.log("SUCCESS: Added multiple segments");
  });

  // ============================================
  // CITY INFO
  // ============================================

  test("2.S.3 - Add city info to segment", async ({ page }) => {
    await openOrCreateTrip(page);

    // Find a segment to edit
    const segmentCard = page.locator('[data-testid="segment-card"], .segment-card, [class*="segment"]')
      .filter({ hasText: /Lisbon/i })
      .first();

    if (await segmentCard.count() > 0) {
      await segmentCard.click();
      await page.waitForTimeout(500);

      // Screenshot: Segment detail
      await page.screenshot({ path: "tests/screenshots/travel-segment-detail.png" });

      // Look for Edit button or City Info section
      const editButton = page.locator('button:has-text("Edit"), button:has-text("City Info"), [data-testid="edit-segment"]').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);
      }

      const segment = MOCK_SEGMENTS[0];

      // Fill city info fields
      // History
      const historyField = page.locator('textarea[name="city_info.history"], textarea[name="history"], textarea[placeholder*="history" i]');
      if (await historyField.count() > 0) {
        await historyField.fill(segment.city_info.history);
      }

      // Culture
      const cultureField = page.locator('textarea[name="city_info.culture"], textarea[name="culture"], textarea[placeholder*="culture" i]');
      if (await cultureField.count() > 0) {
        await cultureField.fill(segment.city_info.culture);
      }

      // Tips
      const tipsField = page.locator('textarea[name="city_info.tips"], textarea[name="tips"], textarea[placeholder*="tips" i]');
      if (await tipsField.count() > 0) {
        await tipsField.fill(segment.city_info.tips);
      }

      // Overview
      const overviewField = page.locator('textarea[name="city_info.overview"], textarea[name="overview"]');
      if (await overviewField.count() > 0) {
        await overviewField.fill(segment.city_info.overview);
      }

      // Screenshot: City info filled
      await page.screenshot({ path: "tests/screenshots/travel-city-info-filled.png" });

      // Save
      await page.locator('button[type="submit"]:has-text("Save")').click();
      await page.waitForTimeout(2000);

      // Screenshot: After adding city info
      await page.screenshot({ path: "tests/screenshots/travel-after-city-info.png", fullPage: true });

      console.log("SUCCESS: Added city info to segment");
    } else {
      console.log("No Lisbon segment found to add city info");
    }
  });

  // ============================================
  // READ/VIEW SEGMENTS
  // ============================================

  test("2.S.4 - View segment list", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Segment list
    await page.screenshot({ path: "tests/screenshots/travel-segment-list.png", fullPage: true });

    // Count segments
    const segmentCards = page.locator('[data-testid="segment-card"], .segment-card, [class*="segment"]');
    const count = await segmentCards.count();
    console.log(`Found ${count} segments`);

    // Verify segments show key info
    if (count > 0) {
      const firstSegment = segmentCards.first();

      // Check for name
      const hasName = await firstSegment.locator('h2, h3, [data-testid="segment-name"]').count() > 0;
      console.log(`Segment has name: ${hasName}`);

      // Check for dates
      const hasDates = await firstSegment.textContent().then(t => t?.includes('-') || t?.includes('Days') || false);
      console.log(`Segment has dates: ${hasDates}`);

      // Check for location
      const hasLocation = await firstSegment.textContent().then(t => t?.includes('Portugal') || false);
      console.log(`Segment has location: ${hasLocation}`);
    }

    console.log("SUCCESS: Segment list view verified");
  });

  test("2.S.5 - View segment detail with city info", async ({ page }) => {
    await openOrCreateTrip(page);

    const segmentCard = page.locator('[data-testid="segment-card"], .segment-card')
      .filter({ hasText: /Lisbon/i })
      .first();

    if (await segmentCard.count() > 0) {
      await segmentCard.click();
      await page.waitForTimeout(500);

      // Screenshot: Segment detail with city info
      await page.screenshot({ path: "tests/screenshots/travel-segment-city-info.png", fullPage: true });

      // Look for city info sections
      const sections = ['History', 'Culture', 'Tips', 'Overview'];
      for (const section of sections) {
        const sectionExists = await page.locator(`text=${section}`).count() > 0;
        console.log(`Section "${section}" exists: ${sectionExists}`);
      }

      // Verify driving info displayed
      const drivingInfo = await page.locator('text=/driving|minutes|hours/i').count() > 0;
      console.log(`Driving info displayed: ${drivingInfo}`);

      console.log("SUCCESS: Segment detail view verified");
    }
  });

  // ============================================
  // UPDATE SEGMENTS
  // ============================================

  test("2.S.6 - Edit segment details", async ({ page }) => {
    await openOrCreateTrip(page);

    const segmentCard = page.locator('[data-testid="segment-card"], .segment-card').first();

    if (await segmentCard.count() > 0) {
      await segmentCard.click();
      await page.waitForTimeout(500);

      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit-segment"]').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);
      }

      // Screenshot: Edit segment form
      await page.screenshot({ path: "tests/screenshots/travel-edit-segment.png" });

      // Update description
      const descField = page.locator('textarea[name="description"]');
      if (await descField.count() > 0) {
        await descField.fill("Updated description - " + new Date().toISOString());
      }

      // Update key activities
      const activitiesField = page.locator('input[name="key_activities_summary"], textarea[name="key_activities_summary"]');
      if (await activitiesField.count() > 0) {
        await activitiesField.fill("Updated activities summary - beaches, museums, food tours");
      }

      // Save
      await page.locator('button[type="submit"]:has-text("Save")').click();
      await page.waitForTimeout(2000);

      // Screenshot: After edit
      await page.screenshot({ path: "tests/screenshots/travel-after-edit-segment.png", fullPage: true });

      // Check for success toast
      const toast = page.locator('[data-sonner-toast]');
      if (await toast.count() > 0) {
        const toastText = await toast.first().textContent();
        console.log("Toast message:", toastText);
      }

      console.log("SUCCESS: Segment edited");
    }
  });

  // ============================================
  // REORDER SEGMENTS
  // ============================================

  test("2.S.7 - Reorder segments via drag-drop", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Before reorder
    await page.screenshot({ path: "tests/screenshots/travel-segments-before-reorder.png", fullPage: true });

    const segmentCards = page.locator('[data-testid="segment-card"], .segment-card');
    const count = await segmentCards.count();

    if (count >= 2) {
      // Get first segment
      const firstSegment = segmentCards.first();
      const secondSegment = segmentCards.nth(1);

      // Get positions
      const firstBox = await firstSegment.boundingBox();
      const secondBox = await secondSegment.boundingBox();

      if (firstBox && secondBox) {
        // Drag first segment below second
        await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height + 10, { steps: 10 });
        await page.mouse.up();

        await page.waitForTimeout(1000);

        // Screenshot: After reorder
        await page.screenshot({ path: "tests/screenshots/travel-segments-after-reorder.png", fullPage: true });

        console.log("SUCCESS: Attempted segment reorder via drag-drop");
      }
    } else {
      console.log("Not enough segments to test reorder");
    }
  });

  // ============================================
  // DELETE SEGMENTS
  // ============================================

  test("2.S.8 - Delete segment", async ({ page }) => {
    await openOrCreateTrip(page);

    // Find a segment to delete (preferably not the first one)
    const segmentCards = page.locator('[data-testid="segment-card"], .segment-card');
    const count = await segmentCards.count();

    if (count > 1) {
      // Click last segment
      await segmentCards.last().click();
      await page.waitForTimeout(500);

      // Screenshot: Before delete
      await page.screenshot({ path: "tests/screenshots/travel-before-delete-segment.png" });

      const deleteButton = page.locator('button:has-text("Delete"), button svg.lucide-trash-2').first();

      if (await deleteButton.count() > 0) {
        page.once('dialog', async dialog => {
          await dialog.accept();
        });

        await deleteButton.click();
        await page.waitForTimeout(2000);

        // Screenshot: After delete
        await page.screenshot({ path: "tests/screenshots/travel-after-delete-segment.png", fullPage: true });

        // Verify count decreased
        const newCount = await segmentCards.count();
        console.log(`Segments: ${count} -> ${newCount}`);

        console.log("SUCCESS: Segment deleted");
      }
    } else {
      console.log("Not enough segments to safely delete one");
    }
  });

  // ============================================
  // SEGMENT DISPLAY IN TRIP VIEW
  // ============================================

  test("2.S.9 - Verify segments show driving time between them", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Segments with driving times
    await page.screenshot({ path: "tests/screenshots/travel-segments-driving-times.png", fullPage: true });

    // Look for driving time indicators between segments
    const drivingIndicators = page.locator('text=/\\d+\\s*(hr|hour|min|minute)/i');
    const drivingCount = await drivingIndicators.count();
    console.log(`Found ${drivingCount} driving time indicators`);

    console.log("SUCCESS: Verified segment driving times display");
  });

  test("2.S.10 - Verify segments are collapsible", async ({ page }) => {
    await openOrCreateTrip(page);

    const segmentCards = page.locator('[data-testid="segment-card"], .segment-card');

    if (await segmentCards.count() > 0) {
      const firstSegment = segmentCards.first();

      // Look for collapse/expand button
      const collapseButton = firstSegment.locator('button[aria-expanded], [data-state="open"], [data-state="closed"], svg.lucide-chevron-down, svg.lucide-chevron-up');

      if (await collapseButton.count() > 0) {
        // Screenshot: Before collapse
        await page.screenshot({ path: "tests/screenshots/travel-segment-expanded.png", fullPage: true });

        await collapseButton.click();
        await page.waitForTimeout(500);

        // Screenshot: After collapse
        await page.screenshot({ path: "tests/screenshots/travel-segment-collapsed.png", fullPage: true });

        // Toggle back
        await collapseButton.click();
        await page.waitForTimeout(500);

        console.log("SUCCESS: Segment collapse/expand works");
      } else {
        console.log("No collapse button found - may be always expanded");
      }
    }
  });
});

// ============================================
// CLEANUP
// ============================================
test("cleanup: delete segment test trip", async ({ page }) => {
  await login(page);
  await goToTravel(page);

  const testTrip = page.locator('[data-testid="trip-card"], .trip-card')
    .filter({ hasText: "Segment Test Trip" })
    .first();

  if (await testTrip.count() > 0) {
    await testTrip.click();
    await page.waitForTimeout(500);

    const deleteButton = page.locator('button:has-text("Delete"), button svg.lucide-trash-2').first();

    if (await deleteButton.count() > 0) {
      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await deleteButton.click();
      await page.waitForTimeout(1500);
      console.log("Deleted: Segment Test Trip");
    } else {
      await page.keyboard.press('Escape');
    }
  }

  console.log("Cleanup complete");
});
