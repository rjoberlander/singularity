import { test, expect } from "@playwright/test";

test("verify route_stops and segment_alternatives data is loaded", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Go to the Portugal trip details page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Set viewport
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Take initial screenshot
  await page.screenshot({
    path: "e2e/screenshots/before-expand.png",
    fullPage: true
  });

  // Now check the UI
  // Click on Sagres & Lagos to expand
  const sagresHeader = page.locator('text=/Sagres.*Lagos/i').first();
  await sagresHeader.click();
  await page.waitForTimeout(1000);

  // Look for route stops in sidebar
  const sidebarStops = page.locator('span:has-text("Stops Along the Way")');
  const sidebarStopsVisible = await sidebarStops.isVisible({ timeout: 3000 });
  console.log("\nSidebar 'Stops Along the Way':", sidebarStopsVisible);

  // Take a focused screenshot of the sidebar
  await page.screenshot({
    path: "e2e/screenshots/sidebar-expanded.png",
    fullPage: true
  });

  // Click on the Sagres segment name to show detail panel
  await page.locator('h3:has-text("Sagres")').first().click();
  await page.waitForTimeout(1000);

  // Check detail panel
  const detailStops = page.locator('text=/Possible Stops Along the Way/i');
  const detailStopsVisible = await detailStops.isVisible({ timeout: 3000 });
  console.log("Detail panel 'Possible Stops Along the Way':", detailStopsVisible);

  await page.screenshot({
    path: "e2e/screenshots/detail-panel-expanded.png",
    fullPage: true
  });

  console.log("\n=== Summary ===");
  console.log("Route stops in API:", tripData.routeStopsCount);
  console.log("Route stops in sidebar:", sidebarStopsVisible);
  console.log("Route stops in detail panel:", detailStopsVisible);
});
