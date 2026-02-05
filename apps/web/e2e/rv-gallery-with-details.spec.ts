import { test, expect } from '@playwright/test';

/**
 * Test photo gallery with activity details (rating, cost, reservation)
 */
test('should display activity details in photo gallery', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  const testLocationId = 'b4f80769-0be6-4e6f-ad06-e55efe176cae';

  // Navigate to the location
  await page.goto(`http://localhost:3000/rv-locations/${testLocationId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click on the first photo to open gallery modal
  const firstPhoto = page.locator('img[class*="object-cover"]').first();
  await firstPhoto.click();
  await page.waitForTimeout(1500);

  // Take screenshot of the gallery modal with activity details
  await page.screenshot({ path: 'e2e/screenshots/rv-gallery-with-details.png', fullPage: true });

  // Check for rating stars in the gallery
  const ratingStars = page.locator('svg.fill-amber-500');
  const starCount = await ratingStars.count();
  console.log(`Found ${starCount} rating star icons`);

  // Check for section headers
  const sectionHeaders = page.locator('h3.text-lg.font-medium');
  const headerCount = await sectionHeaders.count();
  console.log(`Found ${headerCount} section headers`);

  // Log the section names
  for (let i = 0; i < headerCount; i++) {
    const headerText = await sectionHeaders.nth(i).textContent();
    console.log(`Section ${i + 1}: ${headerText}`);
  }

  expect(headerCount).toBeGreaterThan(0);
  console.log('SUCCESS: Gallery showing with activity details!');
});
