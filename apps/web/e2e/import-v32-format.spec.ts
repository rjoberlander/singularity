import { test, expect } from "@playwright/test";

test("Import V3.2 format JSON and verify results", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Track import response
  let importResponse: any = null;
  page.on("response", async (response) => {
    if (response.url().includes("/travel/import") && !response.url().includes("/validate")) {
      try {
        importResponse = await response.json();
      } catch (e) {}
    }
  });

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Upload the new V3.2 JSON
  const fileInput = page.locator('input#import-file-segments');
  await fileInput.setInputFiles("/Users/richard/Downloads/segment-3-sagres-lagos-research.json");
  await page.waitForTimeout(1000);

  // Select Sagres segment
  const selectTrigger = page.locator('[role="combobox"]');
  if (await selectTrigger.isVisible({ timeout: 3000 })) {
    await selectTrigger.click();
    await page.waitForTimeout(500);
    const sagresOption = page.locator('[role="option"]').filter({ hasText: /Sagres/i }).first();
    if (await sagresOption.isVisible({ timeout: 2000 })) {
      await sagresOption.click();
    }
    await page.waitForTimeout(500);
  }

  // Import
  const importButton = page.locator('button').filter({ hasText: "Import" }).last();
  if (await importButton.isVisible({ timeout: 2000 })) {
    await importButton.click();
    await page.waitForTimeout(5000);
  }

  // Check response
  console.log("\n=== IMPORT RESPONSE ===");
  if (importResponse) {
    console.log("Success:", importResponse.success);
    console.log("Created activities:", importResponse.created?.activities);
    console.log("Created research items:", importResponse.created?.research_items);
    console.log("Updated segments:", importResponse.updated?.segments);
    console.log("Errors:", importResponse.errors?.length || 0);
    if (importResponse.errors?.length > 0) {
      console.log("Error details:", importResponse.errors);
    }
  } else {
    console.log("No response captured");
  }

  // Now go to details page to verify
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Expand Sagres segment
  const sagresSegment = page.locator('button').filter({ hasText: /Sagres/i }).first();
  if (await sagresSegment.isVisible({ timeout: 3000 })) {
    await sagresSegment.click();
    await page.waitForTimeout(1000);
  }

  // Scroll to see route stops and alternatives
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/v32-import-result.png", fullPage: true });
  console.log("\nScreenshot saved to e2e/screenshots/v32-import-result.png");

  // Check for route stops
  const routeStopIndicator = page.locator('text=Fortaleza de Beliche').or(page.locator('text=Praia da Luz'));
  if (await routeStopIndicator.isVisible({ timeout: 3000 })) {
    console.log("✓ Route stops visible");
  } else {
    console.log("✗ Route stops NOT visible");
  }

  // Check for alternatives section
  const altSection = page.locator('text=Other Backup Options').or(page.locator('text=ALT'));
  if (await altSection.isVisible({ timeout: 3000 })) {
    console.log("✓ Alternatives section visible");
  } else {
    console.log("✗ Alternatives section NOT visible");
  }

  expect(importResponse?.success).toBe(true);
});
