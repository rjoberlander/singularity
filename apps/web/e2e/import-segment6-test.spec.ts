import { test, expect } from "@playwright/test";

test("Import Segment 6 Peneda-Gerês and verify hot reload", async ({ page }) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "log") {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
    }
  });

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  console.log("✓ Logged in");

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("✓ Plan page loaded");

  // Take screenshot before import
  await page.screenshot({ path: "e2e/screenshots/segment6-before-import.png", fullPage: true });

  // Check segment 6 status before import (in the Segments section - step 3)
  const segment6Row = page.locator('tr').filter({ hasText: /6.*Peneda-Gerês/ }).first();
  const segment6BeforeText = await segment6Row.textContent();
  console.log(`\nSegment 6 before import: ${segment6BeforeText}`);

  // Upload Segment 6 JSON
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles("/Users/richard/Downloads/portugal-segment-6-peneda-geres.json");
  console.log("✓ File uploaded");
  await page.waitForTimeout(2000);

  // Select Peneda-Gerês segment
  const segmentSelector = page.locator('[role="combobox"]');
  await segmentSelector.click();
  await page.waitForTimeout(500);
  const geresOption = page.locator('[role="option"]').filter({ hasText: /Peneda|Gerês/i }).first();
  await geresOption.click();
  console.log("✓ Selected Peneda-Gerês segment");
  await page.waitForTimeout(500);

  // Click Import
  const importButton = page.locator('button').filter({ hasText: /^Import$/ });
  await importButton.click();
  console.log("✓ Clicked Import button");

  // Wait for import to complete and UI to update
  await page.waitForTimeout(5000);

  // Take screenshot after import (before refresh)
  await page.screenshot({ path: "e2e/screenshots/segment6-after-import-no-refresh.png", fullPage: true });

  // Force a hard page refresh
  console.log("Forcing hard page refresh...");
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Take screenshot after refresh
  await page.screenshot({ path: "e2e/screenshots/segment6-after-import.png", fullPage: true });

  // Check segment 6 status after import
  const segment6AfterText = await segment6Row.textContent();
  console.log(`\nSegment 6 after import: ${segment6AfterText}`);

  // Check for success toast
  const successToast = page.locator('[data-sonner-toast]');
  if (await successToast.isVisible({ timeout: 3000 })) {
    const toastText = await successToast.first().textContent();
    console.log(`✓ Toast: ${toastText}`);
  }

  // Check if day circles changed to green (has activities)
  const greenCircles = segment6Row.locator('.bg-green-500');
  const greenCount = await greenCircles.count();
  console.log(`\n✓ Green circles (days with activities): ${greenCount}`);

  // Check if research status shows completed (purple checkmark)
  const purpleCheck = segment6Row.locator('svg.text-purple-500');
  const hasResearchComplete = await purpleCheck.count() > 0;
  console.log(`✓ Research status complete: ${hasResearchComplete}`);

  // Now verify the details page shows activity data
  console.log("\n=== Checking Details Page ===");
  await page.goto(`http://localhost:3000/travel/${tripId}/details?day=day28&activity=vilarinho-das-furnas-museum`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "e2e/screenshots/segment6-museum-detail.png", fullPage: true });

  // Check if the activity panel shows content
  const activityPanel = page.locator('[data-testid="activity-detail-panel"]').or(page.locator('.activity-detail-panel')).or(page.locator('text=Vilarinho'));
  const panelContent = await page.locator('body').textContent();

  if (panelContent?.includes('Vilarinho')) {
    console.log("✓ Vilarinho das Furnas Museum found on page");
  } else {
    console.log("⚠ Vilarinho das Furnas Museum NOT found on page");
  }

  // Check for deep dive content
  if (panelContent?.includes('diorama') || panelContent?.includes('drowned village')) {
    console.log("✓ Deep dive content present");
  } else {
    console.log("⚠ Deep dive content may be missing");
  }

  console.log("\n=== IMPORT TEST COMPLETE ===");
});
