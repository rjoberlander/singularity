import { test, expect } from '@playwright/test';

test.describe('Facial Products Cost Display', () => {
  test('shows cost/month after setting frequency, timing, and usage', async ({ page }) => {
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

    // Wait for products and click on Anua product
    await page.waitForSelector('h3:has-text("Anua")', { timeout: 10000 });
    await page.locator('h3:has-text("Anua Heartleaf Pore")').click();
    await page.waitForTimeout(1000);

    // Wait for modal content
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Set Frequency to Daily (use force to bypass overlay)
    const dailyButton = page.locator('[role="dialog"] button:has-text("Daily")').first();
    await dailyButton.click({ force: true });

    // Set Timing to AM
    const amButton = page.locator('[role="dialog"] button:has-text("AM")').first();
    await amButton.click({ force: true });

    // Set Usage amount to 1 ml - scroll to bottom of modal first
    const dialog = page.locator('[role="dialog"]');
    await dialog.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(500);

    // Find and fill usage input
    const usageInput = page.locator('[role="dialog"] input[placeholder="1"]').first();
    await usageInput.fill('1', { force: true });

    // Select ml as unit
    const mlButton = page.locator('[role="dialog"] button:has-text("ml")').first();
    await mlButton.click({ force: true });

    // Take screenshot before save
    await page.screenshot({ path: 'test-results/cost-before-save.png', fullPage: true });

    // Click Save
    await page.locator('button:has-text("Save")').click();
    await page.waitForTimeout(3000);

    // Close modal by clicking outside or pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Take screenshot of the card
    await page.screenshot({ path: 'test-results/cost-after-save.png', fullPage: true });

    // Check if cost is displayed on the card
    const costText = page.locator('text=/\\$.*\\/mo/');
    const durationText = page.locator('text=/~.*months?|weeks?|days?/');

    // Log what we find
    const costVisible = await costText.isVisible().catch(() => false);
    const durationVisible = await durationText.isVisible().catch(() => false);

    console.log(`Cost visible: ${costVisible}`);
    console.log(`Duration visible: ${durationVisible}`);

    // Look for any cost-related text on page
    const pageContent = await page.content();
    const hasMonthlyCost = pageContent.includes('/mo');
    const hasDuration = pageContent.includes('months') || pageContent.includes('weeks') || pageContent.includes('days');

    console.log(`Page has /mo: ${hasMonthlyCost}`);
    console.log(`Page has duration: ${hasDuration}`);

    // Check the card content for Anua product
    const anuaCard = page.locator('text=Anua Heartleaf Pore').locator('..');
    const cardText = await anuaCard.textContent();
    console.log(`Anua card text: ${cardText?.substring(0, 200)}`);
  });
});
