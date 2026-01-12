import { test, expect } from '@playwright/test';

test('check if trips API returns preview_photos', async ({ page, request }) => {
  // Login first to get auth
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|travel)/, { timeout: 10000 });

  // Now intercept the API call when loading travel page
  let apiResponse: any = null;
  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/travel/trips') && !response.url().includes('/trips/')) {
      try {
        apiResponse = await response.json();
        console.log('API Response:', JSON.stringify(apiResponse, null, 2).substring(0, 2000));
      } catch (e) {
        console.log('Could not parse response');
      }
    }
  });

  await page.goto('http://localhost:3000/travel');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check the first trip for preview_photos
  if (apiResponse?.data?.[0]) {
    console.log('First trip preview_photos:', apiResponse.data[0].preview_photos);
    console.log('First trip name:', apiResponse.data[0].name);
  }
});
