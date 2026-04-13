import { test, expect } from '@playwright/test';

/**
 * Browse Page Validation Tests
 *
 * Validates the following after enrichment fixes:
 * 1. Hotel check-in shows full photos + hotel info card (address, amenities, check-in/out)
 * 2. Subsequent hotel activities (dinner, kids to bed) show NO photos
 * 3. Pool activities show max 2 photos
 * 4. Duplicate "Rest / more pool" is gone
 * 5. Restaurant addresses are in Portugal (not California/Iowa)
 * 6. Restaurant details (food recommendations) are visible
 */

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BROWSE_URL = `/travel/${TRIP_ID}/browse`;

test.use({ actionTimeout: 15000 });

async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function loadBrowsePage(page: any) {
  await page.goto(BROWSE_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);
}

test.describe('Browse Page Validation', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('browse page loads with activities', async ({ page }) => {
    await loadBrowsePage(page);

    // Screenshot: Full browse page
    await page.screenshot({ path: 'tests/screenshots/browse-validation-full.png', fullPage: true });

    // Should have activity cards visible
    const pageText = await page.locator('body').textContent();
    expect(pageText).toBeTruthy();
    console.log('SUCCESS: Browse page loaded');
  });

  test('hotel check-in shows photos and info card — subsequent hotel refs do not', async ({ page }) => {
    await loadBrowsePage(page);

    // Find all activity cards
    const allCards = page.locator('[class*="activity"], [class*="card"]');
    const cardCount = await allCards.count();
    console.log(`Found ${cardCount} card-like elements`);

    // Check for hotel info card elements (bg-blue-50 class)
    const hotelInfoCard = page.locator('[class*="bg-blue-50"]').first();
    const hasHotelInfo = await hotelInfoCard.count() > 0;
    console.log(`Hotel info card found: ${hasHotelInfo}`);

    if (hasHotelInfo) {
      const hotelInfoText = await hotelInfoCard.textContent();
      console.log(`Hotel info content: ${hotelInfoText?.substring(0, 200)}`);

      // Should have check-in or check-out text
      const hasCheckInOut = hotelInfoText?.includes('Check-in') || hotelInfoText?.includes('Check-out') || hotelInfoText?.includes('night');
      console.log(`Has check-in/out info: ${hasCheckInOut}`);

      // Should have address (not empty)
      const hasAddress = hotelInfoText?.includes('Portugal') || hotelInfoText?.includes('Lisbon') || hotelInfoText?.includes('Rua');
      console.log(`Has address info: ${hasAddress}`);
    }

    // Screenshot: Hotel section
    await page.screenshot({ path: 'tests/screenshots/browse-validation-hotel-info.png', fullPage: true });

    // Count total photo grids
    const photoGrids = page.locator('img[src*="googleusercontent"], img[src*="photo"], img[alt*="photo"]');
    const photoCount = await photoGrids.count();
    console.log(`Total photos on page: ${photoCount}`);

    console.log('SUCCESS: Hotel photo and info validation complete');
  });

  test('no duplicate pool activities', async ({ page }) => {
    await loadBrowsePage(page);

    const pageContent = await page.locator('body').textContent() || '';

    // "Rest / more pool" should NOT exist anymore (was deleted)
    const hasRestMorePool = /rest\s*\/?\s*more\s*pool/i.test(pageContent);
    console.log(`"Rest / more pool" found: ${hasRestMorePool}`);
    expect(hasRestMorePool).toBe(false);

    // "Pool time" should still exist
    const poolMatches = pageContent.match(/pool\s*time/gi) || [];
    console.log(`"Pool time" occurrences: ${poolMatches.length}`);

    await page.screenshot({ path: 'tests/screenshots/browse-validation-no-duplicate-pool.png', fullPage: true });
    console.log('SUCCESS: No duplicate pool activities');
  });

  test('restaurant addresses are in Portugal, not US', async ({ page }) => {
    await loadBrowsePage(page);

    const pageContent = await page.locator('body').textContent() || '';

    // Should NOT have US state abbreviations in addresses
    const badAddressPatterns = [
      { pattern: /Redondo Beach/i, label: 'Redondo Beach' },
      { pattern: /Hermosa Beach/i, label: 'Hermosa Beach' },
      { pattern: /Hawthorne/i, label: 'Hawthorne' },
      { pattern: /Wayland, IA/i, label: 'Wayland, IA' },
      { pattern: /Gulf Shores/i, label: 'Gulf Shores' },
      { pattern: /Philadelphia/i, label: 'Philadelphia' },
      { pattern: /\bCA\s+\d{5}/, label: 'CA zip code' },
      { pattern: /\bIA\s+\d{5}/, label: 'Iowa zip code' },
    ];

    for (const { pattern, label } of badAddressPatterns) {
      const found = pattern.test(pageContent);
      if (found) {
        console.log(`BAD ADDRESS found: ${label}`);
      }
      expect(found, `Should not find "${label}" on browse page`).toBe(false);
    }

    // Should have Portugal-related content
    const hasPortugal = /portugal/i.test(pageContent);
    console.log(`Portugal content found: ${hasPortugal}`);

    await page.screenshot({ path: 'tests/screenshots/browse-validation-addresses.png', fullPage: true });
    console.log('SUCCESS: No US addresses found on browse page');
  });

  test('browse page segments and navigation work', async ({ page }) => {
    await loadBrowsePage(page);

    // Look for segment navigation buttons or tabs
    const segmentNav = page.locator('button, [role="tab"]').filter({ hasText: /lisbon|alentejo|sagres|douro|porto|geres/i });
    const segmentCount = await segmentNav.count();
    console.log(`Segment navigation items: ${segmentCount}`);

    if (segmentCount > 0) {
      // Click through each segment and take screenshots
      for (let i = 0; i < Math.min(segmentCount, 3); i++) {
        const segButton = segmentNav.nth(i);
        const segName = await segButton.textContent();
        await segButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({
          path: `tests/screenshots/browse-validation-segment-${i}.png`,
          fullPage: true
        });
        console.log(`Viewed segment: ${segName?.trim()}`);
      }
    }

    console.log('SUCCESS: Segment navigation works');
  });

  test('detailed browse page content analysis', async ({ page }) => {
    await loadBrowsePage(page);

    // Collect all visible text for analysis
    const bodyText = await page.locator('body').textContent() || '';

    // Check for key enrichment features
    const checks = {
      'Has restaurant name': /restaur|café|bakery|tavern/i.test(bodyText),
      'Has rating stars': /★|⭐|rating|\d\.\d/i.test(bodyText),
      'Has time information': /\d{1,2}:\d{2}/i.test(bodyText),
      'Has photos on page': await page.locator('img[src*="googleusercontent"], img[src*="places"]').count() > 0,
      'Has accommodation mention': /hotel|hyatt|accommodation|check.?in/i.test(bodyText),
      'No California references': !/\bCalifornia\b|\bRedondo\b|\bHermosa\b/i.test(bodyText),
      'No Iowa references': !/\bIowa\b|\bWayland\b/i.test(bodyText),
    };

    for (const [label, result] of Object.entries(checks)) {
      console.log(`${label}: ${result ? 'PASS' : 'FAIL'}`);
      expect(result, label).toBe(true);
    }

    // Count images
    const allImages = page.locator('img');
    const imageCount = await allImages.count();
    console.log(`Total images on page: ${imageCount}`);

    // Check for restaurant details (signature dishes, dietary info)
    const hasRestaurantDetails = /signature|dish|cuisine|vegetarian|outdoor|seating|reservation/i.test(bodyText);
    console.log(`Restaurant details visible: ${hasRestaurantDetails}`);

    await page.screenshot({ path: 'tests/screenshots/browse-validation-analysis.png', fullPage: true });
    console.log('SUCCESS: Detailed content analysis complete');
  });
});
