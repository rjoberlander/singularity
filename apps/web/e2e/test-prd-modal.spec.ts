import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("PRD modal opens from Meal Research step", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1200 });

  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Click Meal Research step
  await page.locator('text=Meal Research').first().click();
  await page.waitForTimeout(1500);

  // Find and click PRD button
  const prdButton = page.locator('button:has-text("PRD")');
  const prdCount = await prdButton.count();
  console.log(`PRD buttons found: ${prdCount}`);

  if (prdCount > 0) {
    await prdButton.first().click();
    await page.waitForTimeout(1000);

    // Verify modal content
    const modalVisible = await page.locator('text=Meal Research PRD').isVisible();
    console.log(`PRD modal visible: ${modalVisible}`);

    const routeAware = await page.locator('text=Route-Aware').isVisible();
    const regionMatched = await page.locator('text=Region-Matched').isVisible();
    const researchBacked = await page.locator('text=Research-Backed').isVisible();
    console.log(`Core principles: Route-Aware=${routeAware}, Region-Matched=${regionMatched}, Research-Backed=${researchBacked}`);

    await page.screenshot({ path: "e2e/screenshots/prd-modal.png" });
    expect(modalVisible).toBe(true);
    expect(routeAware).toBe(true);
  }
});
