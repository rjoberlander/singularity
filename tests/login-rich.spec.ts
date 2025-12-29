import { test, expect } from '@playwright/test';

test('should login with Rich account', async ({ page }) => {
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', err => {
    console.log('Page error:', err.message);
  });

  await page.goto('/login');

  // Fill in credentials
  await page.getByLabel(/email/i).fill('rjoberlander@gmail.com');
  await page.getByLabel(/password/i).fill('Cookie123!');

  // Take screenshot before submitting
  await page.screenshot({ path: 'tests/screenshots/rich-login-filled.png', fullPage: true });

  // Click sign in and wait for navigation or error
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for either dashboard or error
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('SUCCESS: Reached dashboard');
    await page.screenshot({ path: 'tests/screenshots/rich-dashboard.png', fullPage: true });
  } catch {
    console.log('Did not reach dashboard, checking for errors...');
    await page.screenshot({ path: 'tests/screenshots/rich-login-result.png', fullPage: true });

    // Check for visible error message
    const errorBox = page.locator('[class*="destructive"]');
    if (await errorBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorBox.textContent();
      console.log('Error message:', errorText);
    }

    // Check page content
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.includes('Internal Server Error')) {
      console.log('FOUND: Internal Server Error on page');
    }

    console.log('Final URL:', page.url());
  }
});
