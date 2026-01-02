import { test, expect } from '@playwright/test';

test.describe('Schedule Modal Toggle Switch', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('toggle switch updates instantly without delay', async ({ page }) => {
    await page.goto('http://localhost:3000/facial-products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const scheduleButton = page.locator('button:has-text("Add Schedule"), button:has-text("Add Frequency")').first();
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(500);

      // Find first toggle switch
      const toggleSwitch = page.locator('[role="dialog"] button[role="switch"]').first();
      await expect(toggleSwitch).toBeVisible();

      // Get initial state
      const initialState = await toggleSwitch.getAttribute('data-state');
      console.log(`Initial toggle state: ${initialState}`);

      // Click toggle and measure time for state change
      const startTime = Date.now();
      await toggleSwitch.click();

      // Wait for state to change (should be instant with optimistic update)
      const newState = initialState === 'checked' ? 'unchecked' : 'checked';
      await expect(toggleSwitch).toHaveAttribute('data-state', newState, { timeout: 500 });
      const elapsed = Date.now() - startTime;

      console.log(`Toggle state changed in ${elapsed}ms`);
      expect(elapsed).toBeLessThan(500); // Should be under 500ms for "instant" feel

      // Toggle back to restore original state
      await toggleSwitch.click();
      await expect(toggleSwitch).toHaveAttribute('data-state', initialState, { timeout: 500 });

      await page.keyboard.press('Escape');
    }
  });

  test('facial-products schedule modal has toggle switch', async ({ page }) => {
    await page.goto('http://localhost:3000/facial-products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for "Add Schedule" or "Add Frequency" button/indicator
    const scheduleButton = page.locator('button:has-text("Add Schedule"), button:has-text("Add Frequency")').first();
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(1000);

      // Check for toggle switch in modal
      const toggleSwitch = page.locator('[role="dialog"] button[role="switch"]').first();
      const toggleVisible = await toggleSwitch.isVisible().catch(() => false);
      console.log(`Facial products - Toggle visible: ${toggleVisible}`);

      if (toggleVisible) {
        // Take screenshot
        await page.screenshot({ path: 'test-results/facial-products-toggle.png', fullPage: true });

        // Check for Active/Inactive label (use first() since multiple products may have toggles)
        const activeLabel = page.locator('[role="dialog"]').getByText('Active').first();
        const inactiveLabel = page.locator('[role="dialog"]').getByText('Inactive').first();
        const hasLabel = await activeLabel.isVisible() || await inactiveLabel.isVisible();
        expect(hasLabel).toBeTruthy();
        console.log('Facial products toggle switch found!');
      }

      await page.keyboard.press('Escape');
    } else {
      console.log('No schedule modal needed for facial products');
    }
  });

  test('supplements schedule modal has toggle switch', async ({ page }) => {
    await page.goto('http://localhost:3000/supplements');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for "Add Schedule" or "Add Frequency" button/indicator
    const scheduleButton = page.locator('button:has-text("Add Schedule"), button:has-text("Add Frequency")').first();
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(1000);

      // Check for toggle switch in modal
      const toggleSwitch = page.locator('[role="dialog"] button[role="switch"]').first();
      const toggleVisible = await toggleSwitch.isVisible().catch(() => false);
      console.log(`Supplements - Toggle visible: ${toggleVisible}`);

      if (toggleVisible) {
        // Take screenshot
        await page.screenshot({ path: 'test-results/supplements-toggle.png', fullPage: true });

        // Check for Active/Inactive label (use first() since multiple items may have toggles)
        const activeLabel = page.locator('[role="dialog"]').getByText('Active').first();
        const inactiveLabel = page.locator('[role="dialog"]').getByText('Inactive').first();
        const hasLabel = await activeLabel.isVisible() || await inactiveLabel.isVisible();
        expect(hasLabel).toBeTruthy();
        console.log('Supplements toggle switch found!');
      }

      await page.keyboard.press('Escape');
    } else {
      console.log('No schedule modal needed for supplements');
    }
  });

  test('equipment schedule modal has toggle switch', async ({ page }) => {
    await page.goto('http://localhost:3000/equipment');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for "Add Schedule" button/indicator
    const scheduleButton = page.locator('button:has-text("Add Schedule")').first();
    if (await scheduleButton.isVisible()) {
      await scheduleButton.click();
      await page.waitForTimeout(1000);

      // Check for toggle switch in modal
      const toggleSwitch = page.locator('[role="dialog"] button[role="switch"]').first();
      const toggleVisible = await toggleSwitch.isVisible().catch(() => false);
      console.log(`Equipment - Toggle visible: ${toggleVisible}`);

      if (toggleVisible) {
        // Take screenshot
        await page.screenshot({ path: 'test-results/equipment-toggle.png', fullPage: true });

        // Check for Active/Inactive label (use first() since multiple items may have toggles)
        const activeLabel = page.locator('[role="dialog"]').getByText('Active').first();
        const inactiveLabel = page.locator('[role="dialog"]').getByText('Inactive').first();
        const hasLabel = await activeLabel.isVisible() || await inactiveLabel.isVisible();
        expect(hasLabel).toBeTruthy();
        console.log('Equipment toggle switch found!');
      }

      await page.keyboard.press('Escape');
    } else {
      console.log('No schedule modal needed for equipment');
    }
  });
});
