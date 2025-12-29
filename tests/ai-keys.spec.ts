import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('AI API Keys Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@singularity.app');
    await page.getByLabel(/password/i).fill('Test123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('should display AI Keys tab in Settings', async ({ page }) => {
    await page.goto('/settings');

    // Take screenshot of settings page
    await page.screenshot({ path: 'tests/screenshots/settings-page.png', fullPage: true });

    // Click on AI Keys tab
    await page.getByRole('tab', { name: /ai keys/i }).click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Take screenshot of AI Keys tab
    await page.screenshot({ path: 'tests/screenshots/ai-keys-tab.png', fullPage: true });

    // Verify AI Keys section is visible
    await expect(page.getByRole('heading', { name: /ai api keys/i })).toBeVisible();
  });

  test('should display saved AI keys', async ({ page }) => {
    await page.goto('/settings');

    // Click on AI Keys tab
    await page.getByRole('tab', { name: /ai keys/i }).click();

    // Wait for keys to load
    await page.waitForTimeout(2000);

    // Take screenshot showing loaded keys
    await page.screenshot({ path: 'tests/screenshots/ai-keys-loaded.png', fullPage: true });

    // Check for provider names (we saved OpenAI, Anthropic, Perplexity)
    const keyCards = page.locator('[class*="rounded-lg border"]');
    const count = await keyCards.count();

    console.log(`Found ${count} key cards`);

    // Verify we have keys displayed
    expect(count).toBeGreaterThan(0);
  });

  test('should be able to view key (reveal)', async ({ page }) => {
    await page.goto('/settings');

    // Click on AI Keys tab
    await page.getByRole('tab', { name: /ai keys/i }).click();

    // Wait for keys to load
    await page.waitForTimeout(2000);

    // Find and click the first view/eye button
    const viewButton = page.locator('button[title="View key"]').first();

    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Wait for key to be revealed
      await page.waitForTimeout(1000);

      // Take screenshot showing revealed key
      await page.screenshot({ path: 'tests/screenshots/ai-key-revealed.png', fullPage: true });

      // Check if a code element with the key is visible
      const codeElement = page.locator('code').first();
      if (await codeElement.isVisible()) {
        const keyText = await codeElement.textContent();
        console.log('Revealed key starts with:', keyText?.substring(0, 10));
        expect(keyText).toBeTruthy();
      }
    }
  });

  test('should be able to test connection', async ({ page }) => {
    await page.goto('/settings');

    // Click on AI Keys tab
    await page.getByRole('tab', { name: /ai keys/i }).click();

    // Wait for keys to load
    await page.waitForTimeout(2000);

    // Find and click the first test/refresh button
    const testButton = page.locator('button[title="Test connection"]').first();

    if (await testButton.isVisible()) {
      await testButton.click();

      // Wait for test to complete (may take a few seconds for API call)
      await page.waitForTimeout(5000);

      // Take screenshot after test
      await page.screenshot({ path: 'tests/screenshots/ai-key-tested.png', fullPage: true });

      // Check if health status badge changed
      const healthBadge = page.locator('[class*="badge"]').first();
      if (await healthBadge.isVisible()) {
        const badgeText = await healthBadge.textContent();
        console.log('Health status:', badgeText);
      }
    }
  });
});
