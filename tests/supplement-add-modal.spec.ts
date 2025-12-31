import { test, expect } from "@playwright/test";

test("supplement add modal has AI and Manual tabs", async ({ page }) => {
  // Login first
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  // Go to supplements page
  await page.goto("http://localhost:3000/supplements");
  await page.waitForTimeout(2000);

  // Take before screenshot
  await page.screenshot({ path: "tests/screenshots/supplements-before-click.png" });

  // Click the first "Add Supplement" button (in sidebar)
  const addButtons = page.locator('button:has-text("Add Supplement")');
  const count = await addButtons.count();
  console.log(`Found ${count} Add Supplement buttons`);
  
  // Click the first one
  await addButtons.first().click();
  await page.waitForTimeout(1000);

  // Take after screenshot
  await page.screenshot({ path: "tests/screenshots/supplement-add-modal.png" });

  // Check if dialog appeared
  const dialog = page.locator('[role="dialog"]');
  const dialogVisible = await dialog.isVisible();
  console.log(`Dialog visible: ${dialogVisible}`);

  if (dialogVisible) {
    // Verify tabs exist
    const aiTab = page.locator('button:has-text("AI Extract")');
    const manualTab = page.locator('button:has-text("Manual")');

    await expect(aiTab).toBeVisible();
    await expect(manualTab).toBeVisible();

    console.log("SUCCESS: Found AI and Manual tabs");
  } else {
    // Take full page screenshot for debugging
    await page.screenshot({ path: "tests/screenshots/supplement-no-dialog.png", fullPage: true });
    throw new Error("Dialog did not appear after clicking Add Supplement");
  }
});
