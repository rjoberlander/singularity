import { test, expect } from '@playwright/test';

test('debug RV locations API', async ({ page, request }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|rv-locations)/);

  // Wait for session to be established
  await page.waitForTimeout(1000);

  // Get cookies for API request
  const cookies = await page.context().cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  // List locations via API
  const listResponse = await page.evaluate(async () => {
    const res = await fetch('/api/v1/rv-locations');
    const data = await res.json();
    return { status: res.status, data };
  });

  console.log('List response status:', listResponse.status);
  console.log('List response:', JSON.stringify(listResponse.data, null, 2).slice(0, 1000));

  // If we have locations, try to get the full details of the first one
  if (listResponse.data?.data?.length > 0) {
    const firstId = listResponse.data.data[0].id;
    console.log('First location ID:', firstId);

    const fullResponse = await page.evaluate(async (id) => {
      const res = await fetch(`/api/v1/rv-locations/${id}/full`);
      const data = await res.json();
      return { status: res.status, data };
    }, firstId);

    console.log('Full response status:', fullResponse.status);
    console.log('Full response:', JSON.stringify(fullResponse.data, null, 2).slice(0, 1000));
  } else {
    console.log('No locations found in list response');
  }
});
