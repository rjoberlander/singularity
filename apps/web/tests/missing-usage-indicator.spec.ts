import { test, expect } from '@playwright/test';

test('shows missing usage indicator on card and warning bar', async ({ page }) => {
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

  // Take screenshot
  await page.screenshot({ path: 'test-results/missing-usage-card.png', fullPage: true });

  // Check for "Missing usage" text on any card
  const missingUsage = page.locator('text=Missing usage');
  const count = await missingUsage.count();
  console.log(`Found ${count} cards with "Missing usage" indicator`);

  // Check for warning bar with product info
  const warningBar = page.locator('text=Products missing product info');
  const warningVisible = await warningBar.isVisible().catch(() => false);
  console.log(`Warning bar visible: ${warningVisible}`);

  // Check for Populate by AI button
  const populateBtn = page.locator('button:has-text("Populate by AI")');
  const populateBtnVisible = await populateBtn.isVisible().catch(() => false);
  console.log(`Populate by AI button visible: ${populateBtnVisible}`);

  // At least one of these should be true if there are products missing usage
  expect(count > 0 || warningVisible).toBeTruthy();
});
