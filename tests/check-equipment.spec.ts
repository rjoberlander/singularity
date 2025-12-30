import { test, expect } from '@playwright/test';

test('check saved equipment', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  await page.click('a[href="/equipment"]');
  await page.waitForURL('**/equipment', { timeout: 10000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'tests/screenshots/equipment-check.png', fullPage: true });

  // Check what's visible
  const content = await page.textContent('body');
  console.log('Page contains iRestore:', content?.includes('iRestore'));
  console.log('Page contains Dr. Pen:', content?.includes('Dr. Pen'));
  console.log('Page contains Eight Sleep:', content?.includes('Eight Sleep'));
  console.log('Page contains LED:', content?.includes('LED'));
});
