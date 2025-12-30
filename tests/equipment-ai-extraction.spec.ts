import { test, expect } from '@playwright/test';

const EQUIPMENT_TEXT = `Based on your project documents, here's your equipment inventory:
Devices & Equipment
DevicePurposeKey SpecsUsage ProtocoliRestore Elite (LLLT)Hair loss treatment500 diodes, triple wavelengthPer device protocol (morning, after shower)Dr. Pen Ultima A6Scalp microneedlingAdjustable depthWeekly, 1.0-1.5mm depth. Skip minoxidil for 24 hrs afterEight Sleep PodSleep temperature regulationBed cooling/heatingAll night — maintains optimal sleep temperatureLED MaskFacial skincareNot specified in docs3-5x/week (evening, after retinol)

Protocol Notes by Device
iRestore Elite

Use in the morning after shower
Part of "Big 4-5" hair stack alongside finasteride, minoxidil, ketoconazole, and microneedling
LLLT works via photobiomodulation — stimulates cellular ATP production in follicles

Dr. Pen Ultima A6

Critical timing: No minoxidil on microneedling day; resume 24 hours after
Creates microchannels that enhance minoxidil absorption ~2x
Clinical data: 82% achieved moderate-to-marked regrowth with combo vs 39% midil alone
Replace needle cartridges regularly (don't reuse excessively)

Eight Sleep Pod

Addresses core body temperature regulation for sleep
Works synergistically with glycine (also lowers core temp)
Can track sleep data — potential integration with your Protocol app

LED Mask

Your docs mention this exists but no brand/specs recorded
Used after retinol application in PM routine
Stop use 5-7 days before professional laser/microneedling treatments`;

test.describe('Equipment AI Extraction', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('Delete existing equipment, then extract via AI', async ({ page }) => {
    // Step 1: Delete any existing equipment
    console.log('Step 1: Deleting existing equipment...');

    // Check if there are equipment cards
    const equipmentCards = page.locator('[class*="Card"]').filter({ hasText: /iRestore|Dr\. Pen|Eight Sleep|LED/ });
    let cardCount = await equipmentCards.count();

    while (cardCount > 0) {
      console.log(`Found ${cardCount} equipment cards, deleting first one...`);

      // Click the first card's menu button
      const firstCard = equipmentCards.first();
      const menuButton = firstCard.locator('button').filter({ has: page.locator('[class*="MoreVertical"]') });

      // Handle dialog confirmation
      page.on('dialog', dialog => dialog.accept());

      await menuButton.click();
      await page.waitForTimeout(300);

      // Click delete
      await page.click('text=Delete');
      await page.waitForTimeout(1000);

      // Recount cards
      cardCount = await equipmentCards.count();
    }

    console.log('All existing equipment deleted');
    await page.screenshot({ path: 'tests/screenshots/equipment-empty.png' });

    // Step 2: Paste equipment info into AI input
    console.log('Step 2: Testing AI extraction...');

    const aiInput = page.locator('[data-testid="equipment-ai-input"]');
    await aiInput.fill(EQUIPMENT_TEXT);

    await page.screenshot({ path: 'tests/screenshots/equipment-ai-input-filled.png' });

    // Step 3: Click Extract button
    const extractButton = page.locator('[data-testid="equipment-extract-button"]');
    await extractButton.click();

    // Wait for extraction (this calls the AI API, so may take a while)
    console.log('Waiting for AI extraction...');

    // Wait for the extraction modal to appear
    await page.waitForSelector('[role="dialog"]:has-text("Review Extracted Equipment")', { timeout: 60000 });

    await page.screenshot({ path: 'tests/screenshots/equipment-extraction-modal.png' });

    // Step 4: Verify extracted items
    const extractedItems = page.locator('[role="dialog"] .rounded-lg.border');
    const extractedCount = await extractedItems.count();
    console.log(`AI extracted ${extractedCount} equipment items`);

    expect(extractedCount).toBeGreaterThanOrEqual(4);

    // Step 5: Click Save button
    const saveButton = page.locator('[role="dialog"] button:has-text("Save")');
    await saveButton.click();

    // Wait for modal to close
    await page.waitForSelector('[role="dialog"]:has-text("Review Extracted Equipment")', { state: 'hidden', timeout: 10000 });

    // Wait for page to refresh
    await page.waitForTimeout(2000);

    // Step 6: Verify equipment was saved
    await page.screenshot({ path: 'tests/screenshots/equipment-after-ai-save.png' });

    // Check that equipment cards are now visible
    await expect(page.locator('text=iRestore').first()).toBeVisible({ timeout: 5000 });

    console.log('AI extraction test completed successfully!');
  });
});
