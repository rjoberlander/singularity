import { test } from "@playwright/test";

test("final visual verification of route stops and alternatives", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Go directly to the details page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
  await page.waitForLoadState("networkidle");

  // Force refresh to get latest data
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Set large viewport
  await page.setViewportSize({ width: 1920, height: 1200 });

  // Expand the Sagres & Lagos segment by clicking on it
  const sagresText = page.locator('text=/Sagres.*Lagos/i').first();
  if (await sagresText.isVisible({ timeout: 5000 })) {
    await sagresText.click();
    await page.waitForTimeout(1000);
    console.log("Clicked to expand Sagres & Lagos");
  }

  // Take screenshot 1: Full page with sidebar expanded
  await page.screenshot({
    path: "e2e/screenshots/final-1-full-page.png",
    fullPage: true
  });

  // Now click on the segment header to show detail panel
  const segmentHeader = page.locator('h3:has-text("Sagres")').first();
  if (await segmentHeader.isVisible({ timeout: 3000 })) {
    await segmentHeader.click();
    await page.waitForTimeout(1000);
  }

  // Check what's visible
  const routeStopsSidebar = page.locator('span:has-text("Stops Along the Way")');
  const routeStopsDetail = page.locator('h4:has-text("Possible Stops Along the Way")');
  const backupOptions = page.locator('h4:has-text("Backup Options")');
  const alternativesSection = page.locator('text=/Alternatives.*\\(/');

  console.log("\n=== Visual Verification ===");
  console.log("Sidebar - 'Stops Along the Way':", await routeStopsSidebar.count() > 0);
  console.log("Detail - 'Possible Stops Along the Way':", await routeStopsDetail.isVisible({ timeout: 2000 }));
  console.log("Detail - 'Backup Options':", await backupOptions.isVisible({ timeout: 2000 }));
  console.log("Sidebar - 'Alternatives' sections:", await alternativesSection.count());

  // Check for specific route stops in the UI
  const praiaLuz = page.locator('text=/Praia da Luz/i');
  const beliche = page.locator('text=/Fortaleza de Beliche/i');
  const burgau = page.locator('text=/Burgau/i');

  console.log("\nRoute Stops Found:");
  console.log("  - Praia da Luz:", await praiaLuz.count() > 0);
  console.log("  - Fortaleza de Beliche:", await beliche.count() > 0);
  console.log("  - Burgau:", await burgau.count() > 0);

  // Take screenshot 2: Detail panel showing route stops
  await page.screenshot({
    path: "e2e/screenshots/final-2-detail-panel.png",
    fullPage: true
  });

  // Scroll the detail panel to see backup options
  const detailPanel = page.locator('[class*="overflow-y-auto"]').last();
  await detailPanel.evaluate(el => el.scrollTop = el.scrollHeight);
  await page.waitForTimeout(500);

  // Take screenshot 3: Scrolled to show backup options
  await page.screenshot({
    path: "e2e/screenshots/final-3-backup-options.png",
    fullPage: true
  });

  console.log("\n✓ Screenshots saved to e2e/screenshots/final-*.png");
});
