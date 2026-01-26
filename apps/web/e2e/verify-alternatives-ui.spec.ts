import { test, expect } from "@playwright/test";

test("verify alternatives and route stops UI", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Navigate to travel
  await page.goto("http://localhost:3000/travel");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take screenshot of travel page
  await page.screenshot({ path: "e2e/screenshots/travel-list.png", fullPage: true });

  // Find any trip card with Portugal in the name
  const tripCards = page.locator('[class*="card"]').filter({ hasText: "Portugal" });
  const tripCardCount = await tripCards.count();
  console.log("Portugal trip cards found:", tripCardCount);

  // Debug: print all links on the page
  const allLinks = await page.locator('a[href*="/travel/"]').all();
  console.log("All travel links found:", allLinks.length);
  for (const link of allLinks.slice(0, 10)) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    console.log(`  Link: ${href} - "${text?.slice(0, 50)}"`);
  }

  // Find trip link that matches UUID pattern (not /guide or other special routes)
  const tripLink = page.locator('a[href*="/travel/"]').filter({
    has: page.locator('text=/Portugal/i')
  }).first();

  // Or try finding by href pattern
  const tripWithUUID = page.locator('a[href^="/travel/"][href*="-"]').first();
  const tripHref = await tripWithUUID.getAttribute('href');
  console.log("Trip with UUID href:", tripHref);

  if (tripHref && tripHref.match(/\/travel\/[a-f0-9-]{36}/)) {
    await tripWithUUID.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  } else {
    // Click directly and wait for navigation
    const portugalTrip = page.locator('text=/Portugal Summer 2026/i').first();
    await portugalTrip.click();
    await page.waitForTimeout(3000);
  }

  // Get trip ID and go to details
  let url = page.url();
  console.log("Current URL after click:", url);

  const tripIdMatch = url.match(/\/travel\/([a-f0-9-]{36})/);
  const tripId = tripIdMatch?.[1];
  console.log("Trip ID:", tripId);

  if (tripId) {
    await page.goto(`http://localhost:3000/travel/${tripId}/details`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  } else {
    console.log("No valid trip ID found - taking screenshot of current page");
    await page.screenshot({ path: "e2e/screenshots/no-trip-found.png", fullPage: true });
    return;
  }

  // Set viewport larger for better screenshot
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Find Sagres & Lagos segment and expand it
  const sagresSegment = page.locator('text="Sagres & Lagos"').first();
  if (await sagresSegment.isVisible({ timeout: 5000 })) {
    console.log("Found Sagres & Lagos segment");

    // Click to expand if needed
    await sagresSegment.click();
    await page.waitForTimeout(1000);

    // Check for route stops section in sidebar
    const routeStopsInSidebar = page.locator('text="Stops Along the Way"');
    const routeStopsVisible = await routeStopsInSidebar.isVisible({ timeout: 3000 });
    console.log("Route stops section in sidebar:", routeStopsVisible);

    // Check for alternatives section in sidebar
    const alternativesInSidebar = page.locator('div:has-text("Alternatives")').filter({ hasText: /^\d+$/ });
    const altSectionCount = await page.locator('text=/Alternatives.*\\(\\d+\\)/').count();
    console.log("Alternatives sections found:", altSectionCount);

    // Check for alternative badges on activities
    const altBadges = page.locator('[title="Has alternatives"]');
    const badgeCount = await altBadges.count();
    console.log("Activities with alternatives badge:", badgeCount);

    // Take full page screenshot
    await page.screenshot({
      path: "e2e/screenshots/details-full-page.png",
      fullPage: true
    });

    // Now click on segment header to see segment details in right panel
    const segmentHeader = page.locator('h3:has-text("Sagres")').first();
    await segmentHeader.click();
    await page.waitForTimeout(1000);

    // Check for route stops in detail panel (partial match)
    const routeStopsDetail = page.locator('text=/Possible Stops Along/i');
    const routeStopsDetailVisible = await routeStopsDetail.isVisible({ timeout: 3000 });
    console.log("Route stops in detail panel:", routeStopsDetailVisible);

    // Check specific route stops
    const praiaLuz = page.locator('text=/Praia da Luz/i');
    const beliche = page.locator('text=/Fortaleza de Beliche/i');
    console.log("  - Praia da Luz visible:", await praiaLuz.isVisible({ timeout: 2000 }));
    console.log("  - Fortaleza de Beliche visible:", await beliche.isVisible({ timeout: 2000 }));

    // Take screenshot of segment detail view
    await page.screenshot({
      path: "e2e/screenshots/segment-detail-panel.png",
      fullPage: true
    });

    // Scroll down to see segment alternatives
    await page.evaluate(() => {
      const rightPanel = document.querySelector('[class*="flex-1"]');
      if (rightPanel) rightPanel.scrollTop = rightPanel.scrollHeight;
    });
    await page.waitForTimeout(500);

    // Check for segment alternatives in detail panel
    const segmentAltDetail = page.locator('text=/Backup Options/i');
    const segmentAltVisible = await segmentAltDetail.isVisible({ timeout: 3000 });
    console.log("Segment alternatives in detail panel:", segmentAltVisible);

    // Take scrolled screenshot
    await page.screenshot({
      path: "e2e/screenshots/segment-detail-scrolled.png",
      fullPage: true
    });

    // Now click on an activity to see if it has alternatives shown
    const boatTourActivity = page.locator('text="Boat Tour"').first();
    if (await boatTourActivity.isVisible({ timeout: 2000 })) {
      await boatTourActivity.click();
      await page.waitForTimeout(1000);

      // Check for alternatives section in activity detail
      const activityAltSection = page.locator('text=/Alternatives.*\\(\\d+\\)/');
      const activityAltVisible = await activityAltSection.isVisible({ timeout: 3000 });
      console.log("Activity alternatives section:", activityAltVisible);

      await page.screenshot({
        path: "e2e/screenshots/activity-with-alternatives.png",
        fullPage: true
      });
    }
  } else {
    console.log("Sagres & Lagos segment not found");
    // Take screenshot anyway
    await page.screenshot({
      path: "e2e/screenshots/details-no-sagres.png",
      fullPage: true
    });
  }

  // Print what we found
  console.log("\n=== UI Verification Summary ===");
});
