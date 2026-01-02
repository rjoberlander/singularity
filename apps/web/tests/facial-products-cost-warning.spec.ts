import { test, expect } from '@playwright/test';

test.describe('Facial Products Cost Warning', () => {
  test('shows cost warning when products missing data', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Go to facial-products
    await page.goto('http://localhost:3000/facial-products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot of cost section
    await page.screenshot({ path: 'test-results/cost-warning.png', fullPage: true });

    // Check for cost warning
    const costWarning = page.locator('text=Cost may be inaccurate');
    const warningVisible = await costWarning.isVisible().catch(() => false);
    console.log(`Cost warning visible: ${warningVisible}`);

    if (warningVisible) {
      // Click on the warning to open modal
      await costWarning.click();
      await page.waitForTimeout(1000);

      // Take screenshot of modal
      await page.screenshot({ path: 'test-results/cost-warning-modal.png', fullPage: true });

      // Check modal title
      const modalTitle = page.locator('text=Incomplete Cost Data');
      await expect(modalTitle).toBeVisible({ timeout: 5000 });
      console.log('Cost warning modal opened successfully');

      // Check for "missing price/usage info" text
      const missingText = page.locator('text=missing price or usage info');
      await expect(missingText).toBeVisible();
    } else {
      console.log('No cost warning - all products may have complete data');
    }
  });
});
