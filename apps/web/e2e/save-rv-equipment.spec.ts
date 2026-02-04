import { test, expect } from '@playwright/test';

test('Save RV equipment settings', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
  await page.fill('input[type="password"]', 'Cookie123!');
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForURL(/(?!.*login).*/);
  await page.waitForTimeout(1000);

  // Navigate to RV locations page
  await page.goto('http://localhost:3000/rv-locations');
  await page.waitForLoadState('networkidle');

  // Click the settings button (gear icon)
  await page.click('button:has([class*="lucide-settings"]), button:has-text("Settings"), [aria-label*="settings"], [aria-label*="Settings"]');

  // Wait for the sheet to open
  await page.waitForSelector('text=Research Settings', { timeout: 5000 });

  // Click on Equipment tab
  await page.click('button:has-text("Equipment"), [role="tab"]:has-text("Equipment")');
  await page.waitForTimeout(500);

  // Fill in the equipment form
  // Trailer Model
  const trailerModelInput = page.locator('input').filter({ has: page.locator('xpath=./preceding-sibling::label[contains(text(),"Trailer Model")] | ./parent::*/preceding-sibling::*//label[contains(text(),"Trailer Model")]') }).first();
  await trailerModelInput.or(page.getByLabel('Trailer Model')).fill('Reflection 260');

  // Trailer Length
  const trailerLengthInput = page.locator('input[type="number"]').first();
  await trailerLengthInput.or(page.getByLabel(/Trailer Length/)).fill('28');

  // Tow Vehicle
  const towVehicleInput = page.getByLabel('Tow Vehicle').or(page.locator('input[placeholder*="Tundra"]'));
  await towVehicleInput.fill('F250 Short Bed');

  // Checkboxes - ensure they are checked
  const starlinkCheckbox = page.getByLabel('Starlink for internet');
  if (!(await starlinkCheckbox.isChecked())) {
    await starlinkCheckbox.check();
  }

  const bikesCheckbox = page.getByLabel('Family bikes');
  if (!(await bikesCheckbox.isChecked())) {
    await bikesCheckbox.check();
  }

  const kayakCheckbox = page.getByLabel('Kayak');
  if (!(await kayakCheckbox.isChecked())) {
    await kayakCheckbox.check();
  }

  const paddleboardCheckbox = page.getByLabel('Paddleboard');
  if (!(await paddleboardCheckbox.isChecked())) {
    await paddleboardCheckbox.check();
  }

  // Take a screenshot before saving
  await page.screenshot({ path: 'apps/web/e2e/screenshots/rv-equipment-before-save.png' });

  // Click Save Equipment button
  await page.click('button:has-text("Save Equipment")');

  // Wait for success toast
  await expect(page.locator('text=Equipment saved')).toBeVisible({ timeout: 10000 });

  // Take a screenshot after saving
  await page.screenshot({ path: 'apps/web/e2e/screenshots/rv-equipment-after-save.png' });

  console.log('Equipment saved successfully!');
});
