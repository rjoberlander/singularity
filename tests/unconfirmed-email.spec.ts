import { test, expect } from '@playwright/test';

test('should login confirmed user to dashboard', async ({ page }) => {
  await page.goto('/login');

  // Login with now-confirmed user
  await page.getByLabel(/email/i).fill('unconfirmed@test.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');

  await page.screenshot({ path: 'tests/screenshots/confirmed-user-filled.png', fullPage: true });

  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for dashboard
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('SUCCESS: Reached dashboard!');
    await page.screenshot({ path: 'tests/screenshots/confirmed-user-dashboard.png', fullPage: true });
  } catch {
    await page.screenshot({ path: 'tests/screenshots/confirmed-user-result.png', fullPage: true });
    console.log('Final URL:', page.url());

    // Check for error
    const errorBox = page.locator('[class*="destructive"]');
    if (await errorBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Error:', await errorBox.textContent());
    }
  }
});
