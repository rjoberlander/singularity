import { test, expect } from '@playwright/test';

/**
 * Verification test using an existing confirmed test user
 * This tests the full login and app access flow
 */

// Use the known test user that exists in the system
const TEST_USER = {
  email: 'test@singularity.app',
  password: 'Test123!',
};

test.describe('Verify Signup Flow with Existing User', () => {
  test('should login and access all main pages', async ({ page }) => {
    // Go to login
    await page.goto('/login');
    await page.screenshot({ path: 'tests/screenshots/verify-login-page.png', fullPage: true });

    // Fill credentials
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.screenshot({ path: 'tests/screenshots/verify-dashboard.png', fullPage: true });

    // Verify dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Navigate to Biomarkers via sidebar
    await page.getByText('Biomarkers').first().click();
    await page.waitForURL(/.*biomarkers/, { timeout: 5000 });
    await page.screenshot({ path: 'tests/screenshots/verify-biomarkers.png', fullPage: true });
    await expect(page).toHaveURL(/.*biomarkers/);

    // Navigate to Supplements via sidebar
    await page.getByText('Supplements').first().click();
    await page.waitForURL(/.*supplements/, { timeout: 5000 });
    await page.screenshot({ path: 'tests/screenshots/verify-supplements.png', fullPage: true });
    await expect(page).toHaveURL(/.*supplements/);

    // Navigate back to Dashboard
    await page.getByText('Dashboard').first().click();
    await page.waitForURL(/.*dashboard/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*dashboard/);

    console.log('✅ Full user flow verified successfully!');
  });
});
