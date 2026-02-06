import { test, expect } from "@playwright/test";

test("Enrich and watch progress", async ({ page }) => {
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

  // Look for progress panel first (might already be running)
  const progressPanel = page.locator('text=Enriching Locations');

  if (await progressPanel.isVisible()) {
    console.log("Progress panel already visible (job in progress)");
    await page.screenshot({ path: "e2e/screenshots/rv-progress-already-running.png", fullPage: true });

    // Verify panel has content
    const panelContent = await page.locator('.fixed.bottom-4.right-4').textContent();
    console.log("Progress panel content:", panelContent);
    expect(panelContent).toContain("Enriching");
    return;
  }

  // Check if Enrich button is available
  const enrichButton = page.locator('button:has-text("Enrich")');

  if (!(await enrichButton.isVisible())) {
    console.log("Enrich button not visible - checking for Researching state");
    await page.screenshot({ path: "e2e/screenshots/rv-no-enrich-button.png", fullPage: true });
    return;
  }

  const buttonText = await enrichButton.textContent();
  console.log("Button text:", buttonText);

  // If there are locations to enrich, click the button
  if (buttonText && buttonText.includes("(")) {
    console.log("Clicking Enrich button...");
    await enrichButton.click();

    // Wait for button to change (show spinner or count)
    await page.waitForTimeout(1000);

    // Take a screenshot immediately after clicking
    await page.screenshot({ path: "e2e/screenshots/rv-enrich-clicked.png", fullPage: true });

    // Check button state
    const newButtonText = await enrichButton.textContent();
    console.log("Button text after click:", newButtonText);

    // Look for the progress panel
    const progressPanelAfterClick = page.locator('text=Enriching Locations');

    // Wait up to 10 seconds for it to appear
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      if (await progressPanelAfterClick.isVisible()) {
        console.log("Progress panel appeared after", i + 1, "seconds!");
        await page.screenshot({ path: "e2e/screenshots/rv-progress-visible.png", fullPage: true });
        break;
      }
      console.log("Waiting for progress panel...", i + 1);
    }

    if (await progressPanelAfterClick.isVisible()) {
      // Get progress info
      const panelText = await page.locator('.fixed.bottom-4.right-4').textContent();
      console.log("Progress panel content:", panelText);
      expect(panelText).toContain("Enriching");
    } else {
      console.log("Progress panel never appeared");
      await page.screenshot({ path: "e2e/screenshots/rv-no-progress-panel.png", fullPage: true });
    }
  } else {
    console.log("No locations to enrich - button text:", buttonText);
  }
});
