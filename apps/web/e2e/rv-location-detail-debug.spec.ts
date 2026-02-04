import { test, expect } from '@playwright/test';

test('debug RV location detail page', async ({ page }) => {
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`Page error: ${err.message}`);
  });

  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|rv-locations)/);

  // Go to RV Locations
  await page.goto('/rv-locations');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Find a location link (not /new)
  const locationLinks = page.locator('a[href*="/rv-locations/"]');
  const count = await locationLinks.count();
  console.log(`Found ${count} location links`);

  for (let i = 0; i < count; i++) {
    const link = locationLinks.nth(i);
    const href = await link.getAttribute('href');
    if (href && !href.includes('/new')) {
      console.log(`Navigating to: ${href}`);

      // Navigate directly to the URL instead of clicking
      await page.goto(href);
      await page.waitForTimeout(3000);

      // Take screenshot
      await page.screenshot({ path: 'e2e/screenshots/rv-location-detail-debug.png', fullPage: true });

      // Check for errors
      if (consoleErrors.length > 0) {
        console.log('Console errors found:');
        consoleErrors.forEach(err => console.log('  -', err));
      } else {
        console.log('No console errors');
      }

      // Check page content
      const pageContent = await page.content();
      if (pageContent.includes('error') || pageContent.includes('Error')) {
        console.log('Page may contain error text');
      }

      // Check for the detail page elements
      const header = page.locator('h1, h2').first();
      if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
        const headerText = await header.textContent();
        console.log('Header found:', headerText);
      } else {
        console.log('No header found - page might be crashing');
      }

      break;
    }
  }
});
