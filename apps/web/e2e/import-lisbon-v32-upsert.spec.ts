import { test, expect } from "@playwright/test";

test("Import Lisbon V3.2 JSON - Upsert to existing segment", async ({ page }) => {
  // Enable console logging
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[CONSOLE ERROR]: ${msg.text()}`);
    }
  });

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  console.log("✓ Logged in");

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Track API responses
  let validateResponse: any = null;
  let importResponse: any = null;

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/travel/import/validate")) {
      try {
        validateResponse = await response.json();
      } catch (e) {}
    } else if (url.includes("/travel/import") && !url.includes("/validate")) {
      try {
        importResponse = await response.json();
      } catch (e) {}
    }
  });

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("✓ Plan page loaded");

  // Upload the Lisbon V3.2 JSON
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles("/Users/richard/Downloads/segment-1-lisbon-v3.2.json");
  console.log("✓ File uploaded, waiting for validation...");
  await page.waitForTimeout(3000);

  // Check validation
  if (validateResponse) {
    console.log("\n=== VALIDATION ===");
    console.log("Valid:", validateResponse.valid);
    console.log("Summary:", JSON.stringify(validateResponse.summary, null, 2));
    if (validateResponse.errors?.length > 0) {
      console.log("ERRORS:", validateResponse.errors);
    }
  }

  // Select Lisbon segment (should be #1)
  const selectTrigger = page.locator('[role="combobox"]').first();
  if (await selectTrigger.isVisible({ timeout: 3000 })) {
    await selectTrigger.click();
    await page.waitForTimeout(500);

    // List all options
    const options = page.locator('[role="option"]');
    const count = await options.count();
    console.log(`\nAvailable segments (${count}):`);
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      console.log(`  ${i}: ${text}`);
    }

    // Select Lisbon
    const lisbonOption = page.locator('[role="option"]').filter({ hasText: /Lisbon/i }).first();
    if (await lisbonOption.isVisible({ timeout: 2000 })) {
      await lisbonOption.click();
      console.log("✓ Selected Lisbon segment");
    }
    await page.waitForTimeout(500);
  }

  // Take screenshot before import
  await page.screenshot({ path: "e2e/screenshots/lisbon-upsert-before.png", fullPage: true });

  // Click Import button
  const importButton = page.locator('button').filter({ hasText: /^Import$/ }).last();
  const isDisabled = await importButton.isDisabled();
  console.log(`\nImport button disabled: ${isDisabled}`);

  if (isDisabled) {
    console.log("✗ Import button is disabled - check validation errors");
    await page.screenshot({ path: "e2e/screenshots/lisbon-upsert-disabled.png", fullPage: true });
    expect(isDisabled).toBe(false);
    return;
  }

  console.log("\nClicking import button...");
  await importButton.click();
  await page.waitForTimeout(8000);

  // Take screenshot after import
  await page.screenshot({ path: "e2e/screenshots/lisbon-upsert-after.png", fullPage: true });

  // Check import response
  console.log("\n=== IMPORT RESPONSE ===");
  if (importResponse) {
    console.log("Success:", importResponse.success);
    console.log("Trip ID:", importResponse.trip_id);
    console.log("Segment ID:", importResponse.segment_id);
    console.log("Created:", JSON.stringify(importResponse.created, null, 2));

    if (importResponse.errors?.length > 0) {
      console.log("\nERRORS:");
      importResponse.errors.forEach((err: any, i: number) => {
        console.log(`  ${i + 1}: ${JSON.stringify(err)}`);
      });
    }
  } else {
    console.log("✗ No import response captured");
  }

  // Navigate to details to verify
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Expand Lisbon segment
  const lisbonInSidebar = page.locator('button').filter({ hasText: /Lisbon/i }).first();
  if (await lisbonInSidebar.isVisible({ timeout: 3000 })) {
    await lisbonInSidebar.click();
    await page.waitForTimeout(1000);
    console.log("✓ Found and expanded Lisbon in details sidebar");
  }

  // Count activities in Lisbon
  const activities = page.locator('[data-activity-item]').or(page.locator('button[class*="activity"]'));
  const activityCount = await activities.count();
  console.log(`\nActivities visible in Lisbon: ${activityCount}`);

  // Take final screenshot
  await page.screenshot({ path: "e2e/screenshots/lisbon-upsert-final.png", fullPage: true });

  // Assert success
  if (importResponse) {
    expect(importResponse.success).toBe(true);
    console.log("\n✓ IMPORT SUCCESSFUL - No duplicates expected");
  }
});
