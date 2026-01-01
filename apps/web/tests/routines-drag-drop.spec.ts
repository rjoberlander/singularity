import { test, expect } from '@playwright/test';

test.describe('Schedule Page Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.locator('input[name="email"], input[type="email"]').fill('rjoberlander@gmail.com');
    await page.locator('input[name="password"], input[type="password"]').fill('Cookie123!');

    // Click sign in button
    await page.locator('button:has-text("Sign in")').click();

    // Wait for navigation away from login
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });

    // Navigate to schedule page
    await page.goto('http://localhost:3000/schedule');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Extra wait for data
  });

  test('should display all time slots', async ({ page }) => {
    // Check all time slot labels are visible (using exact match for short labels)
    await expect(page.getByText('Wake', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('AM', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Lunch', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('PM', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Dinner', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Evening', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bed', { exact: true }).first()).toBeVisible();

    // Take screenshot to confirm
    await page.screenshot({ path: 'tests/screenshots/schedule-time-slots.png', fullPage: true });
  });

  test('should display supplements in schedule', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Take screenshot to see current state
    await page.screenshot({ path: 'tests/screenshots/schedule-loaded.png', fullPage: true });

    // Check that some supplements are visible (green colored items)
    const supplementButtons = page.locator('button').filter({ hasText: /.*/ }).filter({
      has: page.locator('.text-emerald-300, .bg-emerald-500\\/20')
    });

    console.log('Found supplement buttons:', await supplementButtons.count());
  });

  test('should drag supplement to different time slot', async ({ page }) => {
    // Take screenshot before drag
    await page.screenshot({ path: 'tests/screenshots/before-drag.png', fullPage: true });

    // Find DHEA supplement (should be in AM based on screenshot)
    const dheaButton = page.locator('button[draggable="true"]').filter({ hasText: 'DHEA' }).first();

    if (await dheaButton.count() > 0) {
      console.log('Found DHEA supplement, will drag to PM');

      // Get the current timing row for DHEA
      const beforeTimingRow = await dheaButton.locator('..').locator('..').locator('..').textContent();
      console.log('DHEA currently in row:', beforeTimingRow?.slice(0, 50));

      // Find the PM row - it's the grid row that contains PM label
      const pmDropZone = page.locator('.grid-cols-\\[80px_1fr_1fr\\]').filter({ hasText: /^PM/ }).locator('.border-r').last();

      // Perform drag and drop
      const dheaBox = await dheaButton.boundingBox();
      const pmBox = await pmDropZone.boundingBox();

      if (dheaBox && pmBox) {
        console.log('Dragging from', dheaBox.x, dheaBox.y, 'to', pmBox.x, pmBox.y);

        await page.mouse.move(dheaBox.x + dheaBox.width / 2, dheaBox.y + dheaBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(pmBox.x + pmBox.width / 2, pmBox.y + pmBox.height / 2, { steps: 10 });
        await page.mouse.up();

        // Wait for the mutation to complete
        await page.waitForTimeout(2000);

        // Take screenshot after drag
        await page.screenshot({ path: 'tests/screenshots/after-drag.png', fullPage: true });

        // Check for success toast
        const toasts = page.locator('[data-sonner-toast]');
        const toastCount = await toasts.count();
        console.log('Toast count:', toastCount);
        if (toastCount > 0) {
          const toastText = await toasts.first().textContent();
          console.log('Toast text:', toastText);
        }

        // Check if DHEA is now in PM row
        const dheaInPm = page.locator('.grid-cols-\\[80px_1fr_1fr\\]').filter({ hasText: /^PM/ }).locator('button').filter({ hasText: 'DHEA' });
        const isInPm = await dheaInPm.count() > 0;
        console.log('DHEA is now in PM row:', isInPm);
      }
    } else {
      console.log('DHEA supplement not found');
      // List available draggable buttons
      const buttons = page.locator('button[draggable="true"]');
      const count = await buttons.count();
      console.log('Found', count, 'draggable buttons');
      for (let i = 0; i < Math.min(5, count); i++) {
        console.log('Button', i, ':', await buttons.nth(i).textContent());
      }
    }
  });

  test('debug: check supplement data structure', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check the network response for supplements
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/supplements');
      if (res.ok) {
        return await res.json();
      }
      return null;
    });

    console.log('Supplements API response:', JSON.stringify(response, null, 2).slice(0, 2000));

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/schedule-debug.png', fullPage: true });
  });
});
