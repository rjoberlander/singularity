import { test, expect } from "@playwright/test";

test("Check enrichment progress panel", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });

  // Navigate to RV locations
  await page.goto("http://localhost:3000/rv-locations");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Take full page screenshot
  await page.screenshot({ path: "e2e/screenshots/rv-progress-full.png", fullPage: true });

  // Check for progress panel
  const progressPanel = page.locator('.fixed.bottom-4.right-4');
  if (await progressPanel.isVisible()) {
    console.log("Progress panel IS visible!");
    await progressPanel.screenshot({ path: "e2e/screenshots/rv-progress-panel.png" });
  } else {
    console.log("Progress panel NOT visible - checking enrich status");

    // Check if Enrich button shows spinning state
    const enrichButton = page.locator('button:has-text("Enrich")');
    const buttonText = await enrichButton.textContent();
    console.log("Enrich button text:", buttonText);
  }
});
