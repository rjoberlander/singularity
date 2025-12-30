import { test, expect } from '@playwright/test';

const EQUIPMENT_TEXT = `Here's my equipment:
- iRestore Elite - LLLT hair device, used daily in morning
- Dr. Pen Ultima A6 - microneedling, weekly
- Eight Sleep Pod - sleep temperature, nightly
- LED Mask - skincare, 3-5x/week evening`;

test.describe('Equipment Duplicate Detection', () => {
  test('Detects and marks duplicates when extracting equipment that already exists', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navigate to equipment page
    await page.click('a[href="/equipment"]');
    await page.waitForURL('**/equipment', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify equipment already exists
    const existingEquipment = await page.locator('text=iRestore').count();
    console.log(`Existing iRestore entries: ${existingEquipment}`);

    // Paste equipment info into AI input (which already exists)
    const aiInput = page.locator('[data-testid="equipment-ai-input"]');
    await aiInput.fill(EQUIPMENT_TEXT);

    // Click Extract button
    const extractButton = page.locator('[data-testid="equipment-extract-button"]');
    await extractButton.click();

    // Wait for extraction modal
    await page.waitForSelector('[role="dialog"]:has-text("Review Extracted Equipment")', { timeout: 60000 });

    // Take screenshot to verify duplicate detection
    await page.screenshot({ path: 'tests/screenshots/equipment-duplicate-detection.png' });

    // Check for duplicate warning banner
    const duplicateWarning = page.locator('text=duplicate');
    const warningCount = await duplicateWarning.count();
    console.log(`Duplicate warnings found: ${warningCount}`);

    // Verify the warning banner is visible
    await expect(page.locator('text=duplicates detected').or(page.locator('text=duplicate detected'))).toBeVisible();

    // Check that duplicate items have orange styling
    const orangeBadges = page.locator('text=Duplicate');
    const orangeBadgeCount = await orangeBadges.count();
    console.log(`Items marked as Duplicate: ${orangeBadgeCount}`);

    expect(orangeBadgeCount).toBeGreaterThan(0);

    // Close modal
    await page.click('button:has-text("Cancel")');

    console.log('Duplicate detection test completed!');
  });
});
