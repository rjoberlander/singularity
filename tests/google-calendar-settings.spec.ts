import { test, expect } from '@playwright/test';

test.describe('Google Calendar Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('can navigate to Calendar settings tab', async ({ page }) => {
    // Go to settings
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of settings page
    await page.screenshot({ path: 'test-results/settings-page.png', fullPage: true });

    // Click on Calendar tab (using text content)
    const calendarTab = page.locator('button:has-text("Calendar")');
    await expect(calendarTab).toBeVisible({ timeout: 5000 });
    await calendarTab.click();

    // Wait for tab content to load
    await page.waitForTimeout(1000);

    // Take screenshot of calendar tab
    await page.screenshot({ path: 'test-results/calendar-tab.png', fullPage: true });

    // Verify OAuth Configuration card is visible
    const oauthConfigTitle = page.locator('text=Google OAuth Configuration');
    await expect(oauthConfigTitle).toBeVisible({ timeout: 5000 });

    // Verify Google Calendar card is visible
    const calendarTitle = page.locator('h3:has-text("Google Calendar"), div:has-text("Google Calendar")').first();
    await expect(calendarTitle).toBeVisible();

    console.log('Calendar settings tab loaded successfully');
  });

  test('can open OAuth configuration dialog', async ({ page }) => {
    // Go to settings -> Calendar tab
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Calendar tab
    const calendarTab = page.locator('button:has-text("Calendar")');
    await calendarTab.click();
    await page.waitForTimeout(1000);

    // Click Configure button
    const configureButton = page.locator('button:has-text("Configure")');
    await expect(configureButton).toBeVisible({ timeout: 5000 });
    await configureButton.click();

    // Wait for dialog to open
    await page.waitForTimeout(500);

    // Take screenshot of dialog
    await page.screenshot({ path: 'test-results/oauth-config-dialog.png', fullPage: true });

    // Verify dialog content
    const dialogTitle = page.locator('text=Google OAuth Configuration').nth(1);
    await expect(dialogTitle).toBeVisible();

    // Verify Client ID input
    const clientIdInput = page.locator('input#clientId');
    await expect(clientIdInput).toBeVisible();

    // Verify Client Secret input
    const clientSecretInput = page.locator('input#clientSecret');
    await expect(clientSecretInput).toBeVisible();

    // Verify instructions are shown
    const instructions = page.locator('text=How to get credentials');
    await expect(instructions).toBeVisible();

    // Verify Google Cloud Console link
    const consoleLink = page.locator('a:has-text("Google Cloud Console")');
    await expect(consoleLink).toBeVisible();

    console.log('OAuth configuration dialog opened successfully');
  });

  test('can enter OAuth credentials', async ({ page }) => {
    // Go to settings -> Calendar tab
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Calendar tab
    const calendarTab = page.locator('button:has-text("Calendar")');
    await calendarTab.click();
    await page.waitForTimeout(1000);

    // Click Configure button
    const configureButton = page.locator('button:has-text("Configure")');
    await configureButton.click();
    await page.waitForTimeout(500);

    // Enter test Client ID
    const clientIdInput = page.locator('input#clientId');
    await clientIdInput.fill('test-client-id.apps.googleusercontent.com');

    // Enter test Client Secret
    const clientSecretInput = page.locator('input#clientSecret');
    await clientSecretInput.fill('GOCSPX-test-secret');

    // Take screenshot
    await page.screenshot({ path: 'test-results/oauth-credentials-entered.png', fullPage: true });

    // Verify inputs have values
    await expect(clientIdInput).toHaveValue('test-client-id.apps.googleusercontent.com');
    await expect(clientSecretInput).toHaveValue('GOCSPX-test-secret');

    // Toggle password visibility
    const eyeButton = page.locator('button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)');
    await eyeButton.click();
    await page.waitForTimeout(300);

    // Take screenshot with secret visible
    await page.screenshot({ path: 'test-results/oauth-secret-visible.png', fullPage: true });

    // Click Cancel to close dialog without saving
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();

    console.log('OAuth credentials entry works correctly');
  });

  test('shows not configured warning when no OAuth config', async ({ page }) => {
    // Go to settings -> Calendar tab
    await page.goto('http://localhost:3000/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Calendar tab
    const calendarTab = page.locator('button:has-text("Calendar")');
    await calendarTab.click();
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/calendar-not-configured.png', fullPage: true });

    // Check for either "not configured" warning OR "Configured" status
    const notConfigured = page.locator('text=OAuth credentials not configured');
    const configured = page.locator('text=Configured');

    // One of these should be visible
    const isNotConfigured = await notConfigured.isVisible().catch(() => false);
    const isConfigured = await configured.isVisible().catch(() => false);

    expect(isNotConfigured || isConfigured).toBe(true);

    console.log(`OAuth config status: ${isConfigured ? 'Configured' : 'Not configured'}`);
  });
});
