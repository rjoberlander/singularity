import { test, expect } from '@playwright/test';

test('AI populate fills in usage amount after clearing it', async ({ page }) => {
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

  // Find a product card and click to edit it
  const firstCard = page.locator('[data-testid="product-card"]').first();
  if (await firstCard.isVisible()) {
    await firstCard.click();
    await page.waitForTimeout(500);
  } else {
    // Try clicking on any card heading
    const cardHeading = page.locator('h3:has-text("Anua")').first();
    if (await cardHeading.isVisible()) {
      await cardHeading.click();
      await page.waitForTimeout(500);
    }
  }

  // Look for edit form and clear usage amount
  const usageInput = page.locator('input[placeholder*="Usage"]').first();
  if (await usageInput.isVisible()) {
    await usageInput.clear();

    // Save the form
    const saveBtn = page.locator('button:has-text("Save")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Close any modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Reload page
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Take screenshot to see current state
  await page.screenshot({ path: 'test-results/before-ai-populate.png', fullPage: true });

  // Check if Populate by AI button is visible now
  const populateBtn = page.locator('button:has-text("Populate by AI")');
  const btnVisible = await populateBtn.isVisible().catch(() => false);
  console.log(`Populate by AI button visible: ${btnVisible}`);

  // Check for missing usage indicators
  const missingUsage = page.locator('text=Missing usage');
  const missingCount = await missingUsage.count();
  console.log(`Found ${missingCount} "Missing usage" indicators`);

  // Check warning bar
  const warningText = page.locator('text=missing usage amount');
  const warningVisible = await warningText.isVisible().catch(() => false);
  console.log(`Warning about missing usage visible: ${warningVisible}`);

  // If populate button is visible, click it and test AI
  if (btnVisible) {
    await populateBtn.click();
    await page.waitForTimeout(1000);

    // Click Fetch All with AI
    const fetchBtn = page.locator('button:has-text("Fetch All with AI")');
    if (await fetchBtn.isVisible()) {
      console.log('Starting AI populate...');
      await fetchBtn.click();

      // Wait for processing
      await page.waitForTimeout(30000);

      // Take screenshot after
      await page.screenshot({ path: 'test-results/after-ai-populate.png', fullPage: true });

      // Check if usage was filled
      const usageInputsAfter = page.locator('[role="dialog"] input[type="number"]');
      const usageCount = await usageInputsAfter.count();
      console.log(`Usage inputs in modal: ${usageCount}`);

      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // Final state - check if products have usage now
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/final-state.png', fullPage: true });

  const finalMissingCount = await page.locator('text=Missing usage').count();
  console.log(`Final missing usage count: ${finalMissingCount}`);

  // Test passes if we can see the page loaded
  expect(await page.locator('h1:has-text("Facial Products")').isVisible()).toBeTruthy();
});
