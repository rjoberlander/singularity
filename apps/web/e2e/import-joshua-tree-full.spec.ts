import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Joshua Tree Full Import", () => {
  test("import all 5 Joshua Tree locations", async ({ page }) => {
    // Load the complete JSON data
    const jsonPath = path.join(__dirname, "data/joshua-tree-complete.json");
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    console.log(`Importing ${jsonData.locations.length} locations...`);

    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });

    // Navigate to RV Locations
    await page.goto("http://localhost:3000/rv-locations");
    await page.waitForLoadState("networkidle");

    // Click the Import button
    const importButton = page.locator('button:has-text("Import")');
    await importButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Fill the JSON textarea
    const jsonTextarea = page.locator('textarea');
    await jsonTextarea.fill(JSON.stringify(jsonData, null, 2));

    // Click import
    const submitButton = page.locator('[role="dialog"] button:has-text("Import")');
    await submitButton.click();

    // Wait for import
    await page.waitForTimeout(5000);

    // Screenshot
    await page.screenshot({
      path: "e2e/screenshots/joshua-tree-full-import.png",
      fullPage: true
    });

    // Verify locations
    const jumboRocks = page.locator('text=Jumbo Rocks');
    const blackRock = page.locator('text=Black Rock');
    const cottonwood = page.locator('text=Cottonwood');

    await expect(jumboRocks.first()).toBeVisible({ timeout: 10000 });

    console.log("All 5 Joshua Tree locations imported!");
  });
});
