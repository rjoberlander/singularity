import { test } from "@playwright/test";

test("debug via console injection", async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    if (msg.text().includes('[DEBUG]')) {
      console.log('BROWSER:', msg.text());
    }
  });

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Go to details page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Inject debug code to check segment data
  await page.evaluate(() => {
    // Find the segment element and log what data it might have
    const segmentElements = document.querySelectorAll('[class*="segment"]');
    console.log('[DEBUG] Segment elements found:', segmentElements.length);

    // Try to find "Stops Along the Way" text anywhere in the DOM
    const stopsText = document.body.innerHTML.includes('Stops Along the Way');
    console.log('[DEBUG] "Stops Along the Way" in DOM:', stopsText);

    // Check for route stops related elements
    const gitBranch = document.querySelectorAll('svg[class*="lucide-git-branch"]');
    console.log('[DEBUG] GitBranch icons found:', gitBranch.length);
  });

  await page.waitForTimeout(1000);

  // Take screenshot with expanded segment
  const sagres = page.locator('text=/Sagres.*Lagos/i').first();
  if (await sagres.isVisible()) {
    await sagres.click();
    await page.waitForTimeout(1000);
  }

  // Check DOM for route stops section
  const routeStopsSection = await page.locator('text="Stops Along the Way"').count();
  const routeStopsDetail = await page.locator('text="Possible Stops Along the Way"').count();

  console.log('\n=== DOM Check ===');
  console.log('Sidebar "Stops Along the Way":', routeStopsSection);
  console.log('Detail "Possible Stops Along the Way":', routeStopsDetail);

  // Check if the CarIcon is rendered near the route stops
  const carIcons = await page.locator('svg.lucide-car').count();
  console.log('Car icons in DOM:', carIcons);

  await page.screenshot({ path: "e2e/screenshots/debug-console.png", fullPage: true });
});
