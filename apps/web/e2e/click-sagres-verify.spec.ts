import { test, expect } from "@playwright/test";

test("Click Sagres segment and verify route stops in detail panel", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Go to details page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set viewport
  await page.setViewportSize({ width: 1920, height: 1200 });

  // Screenshot before clicking
  await page.screenshot({ path: "e2e/screenshots/before-click-sagres.png", fullPage: true });

  // Find and click on "Sagres & Lagos" segment header (the h3 element, not just text)
  // This should select the segment and show its details in the right panel
  const sagresHeader = page.locator('h3').filter({ hasText: /Sagres.*Lagos/i }).first();

  if (await sagresHeader.isVisible({ timeout: 5000 })) {
    console.log("Found Sagres & Lagos header, clicking...");
    await sagresHeader.click();
    await page.waitForTimeout(2000);
  } else {
    // Try finding it another way
    console.log("Trying alternative selector...");
    const sagresText = page.getByText(/Sagres & Lagos/i).first();
    await sagresText.click();
    await page.waitForTimeout(2000);
  }

  // Screenshot after clicking
  await page.screenshot({ path: "e2e/screenshots/after-click-sagres.png", fullPage: true });

  // Now check what's in the detail panel (right side)
  // Look for route stops section
  const routeStopsSection = page.getByText(/Possible Stops Along the Way/i);
  const routeStopsVisible = await routeStopsSection.isVisible({ timeout: 5000 });
  console.log("Route stops section visible:", routeStopsVisible);

  // Look for specific route stops
  const praiaLuz = page.getByText(/Praia da Luz/i).first();
  const praiaLuzVisible = await praiaLuz.isVisible({ timeout: 3000 });
  console.log("Praia da Luz visible:", praiaLuzVisible);

  // Look for backup options section
  const backupSection = page.getByText(/Backup Options/i);
  const backupVisible = await backupSection.isVisible({ timeout: 3000 });
  console.log("Backup Options section visible:", backupVisible);

  // If not visible, let's see what IS in the right panel
  const rightPanelContent = await page.locator('.flex-1.overflow-y-auto, [class*="detail"], [class*="panel"]').first().textContent();
  console.log("\nRight panel content (first 500 chars):");
  console.log(rightPanelContent?.substring(0, 500));

  // Final screenshot
  await page.screenshot({ path: "e2e/screenshots/sagres-detail-view.png", fullPage: true });

  // Assertions
  expect(routeStopsVisible || praiaLuzVisible).toBe(true);
});
