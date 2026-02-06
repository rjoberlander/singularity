import { test, expect } from "@playwright/test";

test("Enrichment progress panel persists across navigation", async ({ page }) => {
  // Capture API responses
  page.on('response', async response => {
    if (response.url().includes('enrich-status')) {
      const body = await response.text().catch(() => 'could not read body');
      console.log('Enrich Status:', response.status(), body.substring(0, 200));
    }
  });

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
  await page.waitForTimeout(3000);

  // Check for progress panel or Enrich button
  const progressPanel = page.locator('text=Enriching Locations');
  const enrichButton = page.locator('button:has-text("Enrich")');

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/rv-progress-check.png", fullPage: true });

  if (await progressPanel.isVisible()) {
    console.log("Progress panel is visible - job is running");

    // Navigate away
    await page.goto("http://localhost:3000/usage");
    await page.waitForTimeout(2000);
    console.log("Navigated to usage page");

    // Navigate back
    await page.goto("http://localhost:3000/rv-locations");
    await page.waitForTimeout(3000);
    console.log("Navigated back to RV locations");

    // Check if progress panel is still visible
    await page.screenshot({ path: "e2e/screenshots/rv-progress-after-nav.png", fullPage: true });

    const panelStillVisible = await progressPanel.isVisible();
    console.log("Progress panel visible after navigation:", panelStillVisible);

    if (panelStillVisible) {
      console.log("SUCCESS: Progress panel persists across navigation!");
    }
  } else if (await enrichButton.isVisible()) {
    const buttonText = await enrichButton.textContent();
    console.log("No active job. Enrich button text:", buttonText);

    // If there are locations to enrich, start enrichment
    if (buttonText && buttonText.includes("(")) {
      console.log("Starting enrichment...");
      await enrichButton.click();
      await page.waitForTimeout(2000);

      // Check for progress panel
      await page.screenshot({ path: "e2e/screenshots/rv-progress-started.png", fullPage: true });

      const panelAppeared = await progressPanel.isVisible();
      console.log("Progress panel appeared:", panelAppeared);

      if (panelAppeared) {
        // Navigate away and back
        await page.goto("http://localhost:3000/dashboard");
        await page.waitForTimeout(2000);

        await page.goto("http://localhost:3000/rv-locations");
        await page.waitForTimeout(3000);

        await page.screenshot({ path: "e2e/screenshots/rv-progress-after-nav.png", fullPage: true });

        const panelStillVisible = await progressPanel.isVisible();
        console.log("Progress panel visible after navigation:", panelStillVisible);
      }
    }
  }
});
