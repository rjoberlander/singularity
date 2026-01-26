import { test, expect } from "@playwright/test";

test("Re-import to create general alternatives as activities", async ({ page }) => {
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

  // Upload JSON
  const fileInput = page.locator('input#import-file-segments');
  await fileInput.setInputFiles("/Users/richard/Downloads/segment-3-sagres-lagos-research.json");
  await page.waitForTimeout(1000);

  // Select Sagres
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
  if (importResponse) {
    console.log("\n=== IMPORT RESPONSE ===");
    console.log("Success:", importResponse.success);
    console.log("Created activities:", importResponse.created?.activities);
    console.log("Errors:", importResponse.errors?.length || 0);
  }

  expect(importResponse?.success).toBe(true);
});
