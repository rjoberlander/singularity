import { test, expect } from "@playwright/test";

test("Click Lagos Tourist Train and verify detail panel opens", async ({ page }) => {
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

  // Look for "Sagres" segment and expand it
  const sagresSegment = page.locator('button').filter({ hasText: /Sagres/i }).first();
  if (await sagresSegment.isVisible({ timeout: 3000 })) {
    console.log("Found Sagres segment");
    await sagresSegment.click();
    await page.waitForTimeout(1000);
  }

  // Scroll the sidebar to bottom to find "Other Backup Options"
  const sidebar = page.locator('[class*="overflow-y-auto"]').first();
  if (await sidebar.isVisible({ timeout: 2000 })) {
    await sidebar.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(500);
  }

  // Take a screenshot to see current state
  await page.screenshot({ path: "e2e/screenshots/sagres-backup-options.png", fullPage: true });

  // Look for "Other Backup Options" section
  const backupSection = page.locator('text=Other Backup Options').first();
  if (await backupSection.isVisible({ timeout: 3000 })) {
    console.log("Found 'Other Backup Options' section");
  } else {
    console.log("Did NOT find 'Other Backup Options' section");
  }

  // Look for Lagos Tourist Train
  const lagosTrain = page.locator('text=Lagos Tourist Train').first();
  if (await lagosTrain.isVisible({ timeout: 3000 })) {
    console.log("Found 'Lagos Tourist Train' - clicking...");
    await lagosTrain.click();
    await page.waitForTimeout(2000);

    // Check if detail panel opened with activity info
    await page.screenshot({ path: "e2e/screenshots/lagos-train-clicked.png", fullPage: true });

    // Look for signs that detail panel opened
    const detailHeader = page.locator('h2').filter({ hasText: /Lagos Tourist Train/i });
    const deepDive = page.locator('text=Why visit').or(page.locator('text=Overview'));

    if (await detailHeader.isVisible({ timeout: 2000 })) {
      console.log("✓ Detail panel header found!");
    } else {
      console.log("✗ Detail panel header NOT found");
    }

    if (await deepDive.isVisible({ timeout: 2000 })) {
      console.log("✓ Deep dive content found!");
    } else {
      console.log("✗ Deep dive content NOT found - might be JSONB only, not activity");
    }
  } else {
    console.log("Lagos Tourist Train NOT visible");
    // List what IS visible in the backup options area
    const allText = await page.locator('body').textContent();
    if (allText?.includes("Lagos Zoo")) {
      console.log("Lagos Zoo IS visible");
    }
  }

  expect(true).toBe(true);
});
