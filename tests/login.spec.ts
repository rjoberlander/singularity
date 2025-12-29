import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    // Take screenshot of login page
    await page.screenshot({ path: 'tests/screenshots/login-page.png', fullPage: true });

    // Verify login form elements exist
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should login with test credentials and reach dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    await page.getByLabel(/email/i).fill('test@singularity.app');
    await page.getByLabel(/password/i).fill('Test123!');

    // Take screenshot before submitting
    await page.screenshot({ path: 'tests/screenshots/login-filled.png', fullPage: true });

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Take screenshot of dashboard
    await page.screenshot({ path: 'tests/screenshots/dashboard.png', fullPage: true });

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Check for dashboard elements - heading says "Welcome back"
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});
