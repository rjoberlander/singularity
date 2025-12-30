import { test, expect } from '@playwright/test';

test('should stay logged in after waiting', async ({ page }) => {
  // Listen for navigation
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      console.log('Navigated to:', frame.url());
    }
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
  await page.getByLabel(/password/i).fill('Cookie123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('1. Reached dashboard at:', page.url());

  // Wait 3 seconds
  await page.waitForTimeout(3000);
  console.log('2. After 3 seconds:', page.url());

  // Wait 3 more seconds
  await page.waitForTimeout(3000);
  console.log('3. After 6 seconds:', page.url());

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/stay-logged-in.png', fullPage: true });

  // Should still be on dashboard
  expect(page.url()).toContain('/dashboard');
});
