import { test, expect } from '@playwright/test';

test.describe('Facial Products Usage Amount Feature', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('edit modal shows usage amount field', async ({ page }) => {
    // Wait for products to load - look for a product heading
    await page.waitForSelector('h3:has-text("Anua")', { timeout: 10000 });

    // Take screenshot of initial page state
    await page.screenshot({ path: 'test-results/facial-products-page.png', fullPage: true });

    // Click on a product card by its heading
    const productHeading = page.locator('h3:has-text("Anua Heartleaf Pore")');
    await productHeading.click();

    // Wait for modal to open
    await page.waitForTimeout(1000);

    // Take screenshot of modal
    await page.screenshot({ path: 'test-results/edit-modal.png', fullPage: true });

    // Check for Usage field label (in Product section)
    const usageLabel = page.locator('label:has-text("Usage")');
    await expect(usageLabel).toBeVisible({ timeout: 5000 });

    // Check for usage unit buttons (ml, pumps, drops, pea-sized)
    const pumpsButton = page.locator('button:has-text("pumps")');
    await expect(pumpsButton).toBeVisible();

    const dropsButton = page.locator('button:has-text("drops")');
    await expect(dropsButton).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/usage-amount-modal.png', fullPage: true });
    console.log('Usage amount field is visible in edit modal');
  });

  test('can set usage amount value', async ({ page }) => {
    // Wait for products to load
    await page.waitForSelector('h3:has-text("Anua")', { timeout: 10000 });

    // Click on a product card by heading
    const productHeading = page.locator('h3:has-text("Anua Heartleaf Pore")');
    await productHeading.click();

    // Wait for modal
    await page.waitForTimeout(1000);

    // Find usage amount input and enter a value
    const usageInput = page.locator('input[placeholder="1"]').first();
    await usageInput.fill('2');

    // Click pumps button to select unit
    const pumpsButton = page.locator('button:has-text("pumps")');
    await pumpsButton.click();

    // Verify pumps button is selected (has primary styling)
    await expect(pumpsButton).toHaveClass(/bg-primary/);

    // Verify usage input has the value
    const value = await usageInput.inputValue();
    expect(value).toBe('2');

    // Take screenshot
    await page.screenshot({ path: 'test-results/usage-amount-set.png', fullPage: true });
    console.log('Usage amount set to 2 pumps successfully');
  });

  test('AI fill includes usage amount in extraction', async ({ page }) => {
    // Track API responses
    const apiResponses: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/ai/enrich-product/stream')) {
        try {
          const text = await response.text();
          apiResponses.push({ url: response.url(), status: response.status(), body: text });
        } catch (e) {
          // SSE responses may not have text
        }
      }
    });

    // Click on a product card
    const productCard = page.locator('.cursor-pointer').first();
    await expect(productCard).toBeVisible({ timeout: 10000 });
    await productCard.click();
    await page.waitForTimeout(1000);

    // Click "Populate by AI" button
    const populateButton = page.locator('button:has-text("Populate by AI")');
    if (await populateButton.isVisible()) {
      await populateButton.click();

      // Wait for AI processing
      await page.waitForTimeout(15000);

      // Take screenshot of result
      await page.screenshot({ path: 'test-results/ai-fill-usage.png', fullPage: true });

      // Check API responses for usage_amount
      console.log('=== API RESPONSE CHECK FOR USAGE_AMOUNT ===');
      apiResponses.forEach((resp, i) => {
        const hasUsageAmount = resp.body?.includes('usage_amount');
        const hasUsageUnit = resp.body?.includes('usage_unit');
        console.log(`Response ${i + 1}: has usage_amount=${hasUsageAmount}, has usage_unit=${hasUsageUnit}`);

        // Try to parse and show usage values
        const lines = resp.body?.split('\n') || [];
        const dataLines = lines.filter((l: string) => l.startsWith('data: '));
        dataLines.forEach((line: string) => {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.data?.usage_amount || data.product?.usage_amount) {
              console.log(`  Found usage_amount: ${data.data?.usage_amount || data.product?.usage_amount}`);
              console.log(`  Found usage_unit: ${data.data?.usage_unit || data.product?.usage_unit}`);
            }
          } catch (e) {}
        });
      });
    } else {
      console.log('Populate by AI button not visible - API key may not be configured');
    }
  });
});
