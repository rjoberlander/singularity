import { test, expect } from '@playwright/test';

// Run tests serially to avoid data conflicts (all tests modify the same user)
test.describe.configure({ mode: 'serial' });

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@singularity.app');
    await page.getByLabel(/password/i).fill('Test123!');
    // Use force: true to bypass Next.js dev overlay
    await page.getByRole('button', { name: /sign in/i }).click({ force: true });
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should load profile settings with user data from database', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');

    // Wait for the profile tab to be visible and loaded
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for the data to load (email should be populated)
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();

    // Wait for the email value to be populated (network request)
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });
    await expect(emailInput).toBeDisabled();

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/settings-profile-loaded.png', fullPage: true });
  });

  test('should save and persist name changes', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for data to load first (email should be populated)
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });

    // Generate a unique name to test with
    const testName = `TestUser_${Date.now()}`;

    // Clear and fill the name field
    const nameInput = page.locator('input#name');
    await nameInput.clear();
    await nameInput.fill(testName);

    // Take screenshot before saving
    await page.screenshot({ path: 'tests/screenshots/settings-name-before-save.png', fullPage: true });

    // Click Save Changes (force to bypass any overlays)
    await page.getByRole('button', { name: /save changes/i }).click({ force: true });

    // Wait for save to complete (button should not show loading spinner)
    await expect(page.getByRole('button', { name: /save changes/i })).not.toBeDisabled({ timeout: 5000 });

    // Reload the page to verify persistence
    await page.reload();
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for data to reload
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });

    // Verify the name persisted
    await expect(nameInput).toHaveValue(testName);

    // Take screenshot after reload
    await page.screenshot({ path: 'tests/screenshots/settings-name-after-reload.png', fullPage: true });
  });

  test('should save and persist timezone changes', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for data to load first
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });

    // Click the timezone dropdown
    await page.locator('button').filter({ hasText: /time/i }).click();

    // Select a different timezone (Eastern Time)
    await page.getByRole('option', { name: /eastern time/i }).click();

    // Take screenshot before saving
    await page.screenshot({ path: 'tests/screenshots/settings-timezone-before-save.png', fullPage: true });

    // Click Save Changes (force to bypass any overlays)
    await page.getByRole('button', { name: /save changes/i }).click({ force: true });

    // Wait for save to complete
    await expect(page.getByRole('button', { name: /save changes/i })).not.toBeDisabled({ timeout: 5000 });

    // Reload the page to verify persistence
    await page.reload();
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for data to reload
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });

    // Verify the timezone persisted (check the trigger shows Eastern Time)
    await expect(page.locator('button').filter({ hasText: /eastern time/i })).toBeVisible();

    // Take screenshot after reload
    await page.screenshot({ path: 'tests/screenshots/settings-timezone-after-reload.png', fullPage: true });
  });

  test('should save both name and timezone together', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for data to load first
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });

    // Update name
    const testName = `FullTest_${Date.now()}`;
    const nameInput = page.locator('input#name');
    await nameInput.clear();
    await nameInput.fill(testName);

    // Update timezone to Mountain Time
    await page.locator('button').filter({ hasText: /time/i }).click();
    await page.getByRole('option', { name: /mountain time/i }).click();

    // Save (force to bypass any overlays)
    await page.getByRole('button', { name: /save changes/i }).click({ force: true });
    await expect(page.getByRole('button', { name: /save changes/i })).not.toBeDisabled({ timeout: 5000 });

    // Reload and verify both persisted
    await page.reload();
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();

    // Wait for data to reload
    await expect(emailInput).toHaveValue('test@singularity.app', { timeout: 10000 });

    await expect(nameInput).toHaveValue(testName);
    await expect(page.locator('button').filter({ hasText: /mountain time/i })).toBeVisible();

    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/settings-full-test-complete.png', fullPage: true });
  });
});
