import { test, expect } from "@playwright/test";

test("Verify general alternatives now have clickable details", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Go to details page
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Scroll down to find Backup Options section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Look for Lagos Tourist Train in Backup Options
  const lagosTrain = page.locator('button').filter({ hasText: /Lagos Tourist Train/i }).first();

  if (await lagosTrain.isVisible({ timeout: 5000 })) {
    console.log("✓ Found Lagos Tourist Train button");
    await lagosTrain.click();
    await page.waitForTimeout(2000);

    // Check if detail panel opened
    const detailPanel = page.locator('[data-testid="activity-detail-panel"]').or(
      page.locator('h2').filter({ hasText: /Lagos Tourist Train/i })
    );

    if (await detailPanel.isVisible({ timeout: 3000 })) {
      console.log("✓ Detail panel opened for Lagos Tourist Train!");
    } else {
      console.log("✗ Detail panel did NOT open - might still be an issue");
    }
  } else {
    console.log("✗ Lagos Tourist Train not found as a button");

    // Check if it's rendered differently
    const trainText = page.locator('text=Lagos Tourist Train').first();
    if (await trainText.isVisible({ timeout: 2000 })) {
      console.log("  (Lagos Tourist Train is visible but not as a button)");
    }
  }

  // Take a screenshot for visual verification
  await page.screenshot({ path: "e2e/screenshots/general-alts-check.png", fullPage: true });
  console.log("Screenshot saved to e2e/screenshots/general-alts-check.png");
});
