import { test, expect } from '@playwright/test';

test('AI populate fills in usage amount', async ({ page }) => {
  // Capture API responses
  const apiResponses: any[] = [];
  page.on('response', async (response) => {
    if (response.url().includes('/ai/enrich-product/stream')) {
      try {
        const text = await response.text();
        apiResponses.push({ url: response.url(), status: response.status(), body: text.substring(0, 2000) });
      } catch (e) {
        // SSE may not have text
      }
    }
  });

  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Go to facial-products
  await page.goto('http://localhost:3000/facial-products');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Click "Populate by AI" button
  const populateBtn = page.locator('button:has-text("Populate by AI")');
  if (await populateBtn.isVisible()) {
    await populateBtn.click();
    await page.waitForTimeout(1000);

    // Take screenshot of modal before processing
    await page.screenshot({ path: 'test-results/ai-modal-before.png', fullPage: true });

    // Click the "Fetch All with AI" button to start AI
    const fetchBtn = page.locator('button:has-text("Fetch All with AI")');
    if (await fetchBtn.isVisible()) {
      console.log('Clicking Fetch All with AI button...');
      await fetchBtn.click();
    } else {
      console.log('Fetch All with AI button not visible');
    }

    // Wait for processing (up to 60 seconds)
    console.log('Waiting for AI to process...');
    await page.waitForTimeout(45000);

    // Take screenshot after processing
    await page.screenshot({ path: 'test-results/ai-modal-after.png', fullPage: true });

    // Log API responses
    console.log('=== API RESPONSES ===');
    apiResponses.forEach((resp, i) => {
      console.log(`Response ${i + 1}:`);
      const hasUsage = resp.body?.includes('usage_amount');
      console.log(`  Has usage_amount: ${hasUsage}`);
      if (hasUsage) {
        // Try to extract the usage_amount value
        const match = resp.body.match(/usage_amount["\s:]+(\d+)/);
        if (match) console.log(`  usage_amount value: ${match[1]}`);
      }
    });

    // Check if any usage values were filled in the UI
    const usageInputs = page.locator('[role="dialog"] input[type="number"]');
    const usageCount = await usageInputs.count();
    console.log(`Found ${usageCount} number inputs in modal`);

    // Look for green-styled inputs (filled by AI)
    const filledInputs = page.locator('[role="dialog"] input.bg-emerald-500\\/10');
    const filledCount = await filledInputs.count();
    console.log(`Found ${filledCount} AI-filled inputs (green)`);

  } else {
    console.log('Populate by AI button not visible - no products missing info');
  }
});
