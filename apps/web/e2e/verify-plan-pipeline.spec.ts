import { test, expect } from '@playwright/test';

const TRIP_ID = '2e2ae20a-832b-4e7c-9419-2afdb506b6ab';
const BASE_URL = 'http://localhost:3000';

test.describe('Plan page 7-step pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel)/, { timeout: 10000 });
  });

  test('plan page renders 7 steps in correct order', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
    await page.waitForTimeout(3000);

    // Check header
    const header = page.locator('text=Trip Planning Guide');
    await expect(header).toBeVisible();

    // Check "View Guide" button exists
    const guideBtn = page.locator('text=View Guide');
    await expect(guideBtn).toBeVisible();

    // Check progress shows "X/7 complete"
    const progress = page.locator('text=/\\d+\\/7 complete/');
    await expect(progress).toBeVisible();

    // Check all 7 step titles appear
    const stepTitles = [
      'Trip Basics',
      'Segments',
      'Accommodations',
      'Activities',
      'Meal Research',
      'Enrichment',
      'Schedule & Timing',
    ];

    for (const title of stepTitles) {
      const el = page.locator(`text=${title}`).first();
      await expect(el).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'e2e/screenshots/plan-7-steps.png', fullPage: true });
  });

  test('PRD dialog opens and shows 7 sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
    await page.waitForTimeout(3000);

    // Click "View Guide" button
    await page.click('text=View Guide');
    await page.waitForTimeout(500);

    // Check dialog opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Check it has the title
    await expect(dialog.locator('text=Trip Planning Guide')).toBeVisible();

    // Check all 7 step sections appear
    for (const title of ['Trip Basics', 'Segments', 'Accommodations', 'Activities', 'Meal Research', 'Enrichment (Gap-Filler)', 'Schedule & Timing']) {
      await expect(dialog.locator(`text=${title}`).first()).toBeVisible();
    }

    // Check "Content Depth Hierarchy" section
    await expect(dialog.locator('text=Content Depth Hierarchy')).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/plan-prd-dialog.png' });
  });

  test('enrichment step shows gap status columns and deep enrich button', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
    await page.waitForTimeout(3000);

    // Click on Enrichment step (step 6)
    const enrichmentStep = page.locator('text=Enrichment').first();
    await enrichmentStep.click();
    await page.waitForTimeout(1000);

    // Check the description
    await expect(page.locator('text=Gap-Filler & Deep Enrichment')).toBeVisible();

    // Check trip-level enrichment status (split: Location Details + Trip Details)
    await expect(page.locator('text=Location details:').first()).toBeVisible();
    await expect(page.locator('text=Trip details:').first()).toBeVisible();

    // Check enrichment-specific columns exist
    await expect(page.locator('th:has-text("Details")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Location")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Narrative")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Day Stories")').first()).toBeVisible();

    // Check the "Run Deep Enrichment" button exists
    const deepEnrichBtn = page.locator('text=Run Deep Enrichment');
    await expect(deepEnrichBtn).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/plan-enrichment-step.png', fullPage: true });
  });

  test('schedule step shows assembled column', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
    await page.waitForTimeout(3000);

    const scheduleStep = page.locator('text=Schedule & Timing').first();
    await scheduleStep.click();
    await page.waitForTimeout(1000);

    // Check schedule-specific columns
    await expect(page.locator('th:has-text("Assembled")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Meals")').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/plan-schedule-columns.png', fullPage: true });
  });

  test('activities step shows activity status table', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
    await page.waitForTimeout(3000);

    // Click on Activities step (step 4)
    const activitiesStep = page.locator('text=Activities').first();
    await activitiesStep.click();
    await page.waitForTimeout(1000);

    // Check description
    await expect(page.locator('text=Review & Enrich Activities')).toBeVisible();

    // Check table headers (use first() since multiple tables may exist)
    await expect(page.locator('th:has-text("Places")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Photos")').first()).toBeVisible();
    await expect(page.locator('th:has-text("Details")').first()).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/plan-activities-step.png', fullPage: true });
  });

  test('schedule step shows assemble button', async ({ page }) => {
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/plan`);
    await page.waitForTimeout(3000);

    // Click on Schedule step (step 7)
    const scheduleStep = page.locator('text=Schedule & Timing').first();
    await scheduleStep.click();
    await page.waitForTimeout(1000);

    // Check description
    await expect(page.locator('text=Schedule & Validate')).toBeVisible();

    // Check Assemble Schedule button exists
    const assembleBtn = page.locator('text=Assemble Schedule');
    await expect(assembleBtn).toBeVisible();

    await page.screenshot({ path: 'e2e/screenshots/plan-schedule-step.png', fullPage: true });
  });
});
