import { test, expect } from '@playwright/test';

test('verbose debug RV location detail', async ({ page }) => {
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  });

  // Capture network requests
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('rv-locations')) {
      const status = response.status();
      let body = '';
      try {
        body = await response.text();
      } catch (e) {}
      console.log(`[Network] ${response.request().method()} ${url} -> ${status}`);
      if (status >= 400) {
        console.log(`[Network Body] ${body.slice(0, 500)}`);
      }
    }
  });

  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|rv-locations)/);

  // Go to RV Locations list
  await page.goto('/rv-locations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Check if there are any locations
  const pageContent = await page.content();
  const hasLocations = pageContent.includes('Death Valley') || pageContent.includes('Joshua Tree');
  console.log('Has locations in list:', hasLocations);

  // Take screenshot of list
  await page.screenshot({ path: 'e2e/screenshots/rv-debug-list.png', fullPage: true });

  // Find a real location link
  const links = await page.locator('a[href*="/rv-locations/"]').all();
  console.log('Found links:', links.length);

  for (const link of links) {
    const href = await link.getAttribute('href');
    if (href && !href.includes('/new') && href.match(/\/rv-locations\/[a-f0-9-]+/)) {
      console.log('Navigating to:', href);

      // Navigate to detail page
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({ path: 'e2e/screenshots/rv-debug-detail.png', fullPage: true });

      // Check page content
      const detailContent = await page.content();
      console.log('Detail page has "not found":', detailContent.includes('not found'));
      console.log('Detail page has location name:', detailContent.includes('Death Valley') || detailContent.includes('California'));

      break;
    }
  }
});
