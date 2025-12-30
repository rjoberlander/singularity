import { test, expect } from '@playwright/test';

test.describe('Biomarkers Page UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|biomarkers)/, { timeout: 15000 });
  });

  test('biomarkers page displays correctly', async ({ page }) => {
    // Navigate to biomarkers page
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Biomarkers")', { timeout: 10000 });

    // Take a full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/biomarkers-full-page.png',
      fullPage: true
    });

    // Check that the page title is visible
    await expect(page.locator('h1')).toContainText('Biomarkers');

    // Check for biomarker summary section
    const summary = page.locator('text=BIOMARKER SUMMARY');
    await expect(summary).toBeVisible();

    // Check for all biomarkers section
    const allBiomarkers = page.locator('text=ALL BIOMARKERS');
    await expect(allBiomarkers).toBeVisible();

    console.log('✓ Page structure verified');
  });

  test('biomarker cards render correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Biomarkers")', { timeout: 10000 });

    // Wait a bit for cards to render
    await page.waitForTimeout(2000);

    // Check for specific biomarker cards (using lab report format abbreviations)
    const ldlCard = page.locator('h3:has-text("LDL Cholesterol")').first();
    const hba1cCard = page.locator('h3:has-text("Hemoglobin A1c")').first();
    const rbcCard = page.locator('h3:has-text("RBC")').first();

    // Screenshot individual cards if they exist
    if (await ldlCard.isVisible()) {
      const ldlCardContainer = ldlCard.locator('xpath=ancestor::div[contains(@class, "rounded")]').first();
      await ldlCardContainer.screenshot({ path: 'tests/screenshots/biomarker-ldl.png' });
      console.log('✓ LDL Cholesterol card captured');
    }

    if (await hba1cCard.isVisible()) {
      const hba1cCardContainer = hba1cCard.locator('xpath=ancestor::div[contains(@class, "rounded")]').first();
      await hba1cCardContainer.screenshot({ path: 'tests/screenshots/biomarker-hba1c.png' });
      console.log('✓ HbA1c card captured');
    }

    if (await rbcCard.isVisible()) {
      const rbcCardContainer = rbcCard.locator('xpath=ancestor::div[contains(@class, "rounded")]').first();
      await rbcCardContainer.screenshot({ path: 'tests/screenshots/biomarker-rbc.png' });
      console.log('✓ RBC card captured');
    }

    // Take viewport screenshot of visible cards
    await page.screenshot({ path: 'tests/screenshots/biomarkers-viewport.png' });
  });

  test('filter and sort controls work', async ({ page }) => {
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Biomarkers")', { timeout: 10000 });

    // Test filter dropdown
    const filterTrigger = page.locator('button:has-text("Show All")').first();
    if (await filterTrigger.isVisible()) {
      await filterTrigger.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'tests/screenshots/biomarkers-filter-open.png' });

      // Click "With Data Only" option
      const withDataOption = page.locator('text=With Data Only');
      if (await withDataOption.isVisible()) {
        await withDataOption.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/biomarkers-filtered.png' });
        console.log('✓ Filter applied successfully');
      }
    }

    // Reset filter
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');

    // Test category dropdown
    const categoryTrigger = page.locator('button:has-text("All Categories")').first();
    if (await categoryTrigger.isVisible()) {
      await categoryTrigger.click();
      await page.waitForTimeout(500);

      // Select Lipid category
      const lipidOption = page.locator('text=Lipid');
      if (await lipidOption.isVisible()) {
        await lipidOption.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'tests/screenshots/biomarkers-lipid-category.png' });
        console.log('✓ Category filter applied successfully');
      }
    }
  });

  test('empty biomarker cards display correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Biomarkers")', { timeout: 10000 });

    // Wait for cards to render
    await page.waitForTimeout(2000);

    // Find cards with "No Data" badge
    const noDataBadges = page.locator('span:has-text("No Data")');
    const count = await noDataBadges.count();
    console.log(`Found ${count} biomarkers with no data`);

    if (count > 0) {
      // Screenshot first empty card
      const firstNoData = noDataBadges.first();
      const emptyCard = firstNoData.locator('xpath=ancestor::div[contains(@class, "rounded")]').first();
      await emptyCard.screenshot({ path: 'tests/screenshots/biomarker-empty.png' });
      console.log('✓ Empty biomarker card captured');
    }
  });

  test('scroll through all biomarkers and capture', async ({ page }) => {
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('h1:has-text("Biomarkers")', { timeout: 10000 });

    // Wait for initial render
    await page.waitForTimeout(2000);

    // Take screenshots while scrolling
    for (let i = 0; i < 5; i++) {
      await page.screenshot({
        path: `tests/screenshots/biomarkers-scroll-${i}.png`,
        fullPage: false
      });

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(500);
    }

    console.log('✓ Captured 5 scroll positions');
  });
});
