import { test, expect } from '@playwright/test';

test('RV location single page layout works', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for any dev overlays to settle

  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');

  // Use keyboard to submit instead of click to avoid overlay issues
  await page.press('input[type="password"]', 'Enter');
  await page.waitForURL(/\/(dashboard|rv-locations)/, { timeout: 15000 });

  // Go to RV Locations list
  await page.goto('/rv-locations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Find a location link and navigate
  const locationLink = page.locator('a[href*="/rv-locations/"]').filter({ hasText: /Death Valley|Joshua Tree|Furnace Creek/i }).first();

  if (await locationLink.count() > 0) {
    const href = await locationLink.getAttribute('href');
    console.log('Navigating to:', href);

    // Navigate directly instead of clicking
    await page.goto(href!);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of the new single-page layout
    await page.screenshot({ path: 'e2e/screenshots/rv-single-page-layout.png', fullPage: true });

    // Verify key sections are present (no tabs)
    const pageContent = await page.content();

    // Should NOT have tabs navigation
    expect(pageContent).not.toContain('href="/rv-locations/');

    // Should have key sections on the single page
    const hasActivitiesSection = pageContent.includes('Activities') || pageContent.includes('activities');
    const hasMediaSection = pageContent.includes('Photos') || pageContent.includes('Media') || pageContent.includes('Gallery');
    const hasSidebar = pageContent.includes('RV Logistics') || pageContent.includes('The Vibe') || pageContent.includes('Cost');

    console.log('Has Activities section:', hasActivitiesSection);
    console.log('Has Media/Photos section:', hasMediaSection);
    console.log('Has Sidebar content:', hasSidebar);

    // Verify essential UI elements
    expect(hasActivitiesSection || hasMediaSection || hasSidebar).toBeTruthy();

    console.log('Single page layout test passed!');
  } else {
    console.log('No location found to test - listing page may be empty');
    await page.screenshot({ path: 'e2e/screenshots/rv-list-empty.png', fullPage: true });
  }
});
