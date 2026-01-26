import { test } from "@playwright/test";
import path from "path";

test("Simple import test", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go directly to the plan page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/plan-page-loaded.png", fullPage: true });
  console.log("Screenshot saved to plan-page-loaded.png");

  // Check if file input exists
  const fileInput = page.locator('#import-file-segments');
  const exists = await fileInput.count();
  console.log("File input exists:", exists > 0);

  if (exists === 0) {
    console.log("File input not found, page may not have loaded correctly");
    return;
  }

  // Capture API responses
  const responses: any[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("/travel/import")) {
      try {
        const body = await response.json();
        responses.push({ url: response.url(), status: response.status(), body });
        console.log(`API: ${response.status()} ${response.url()}`);
      } catch {}
    }
  });

  // Upload file
  const filePath = path.resolve("/Users/richard/Downloads/segment-1-lisbon-research.json");
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(2500);

  // Check dialog
  const dialog = page.locator('[role="alertdialog"]');
  if (await dialog.isVisible()) {
    console.log("Dialog appeared");

    // Check auto-selected segment
    const select = page.locator('[role="alertdialog"] [role="combobox"]');
    const selectedText = await select.textContent();
    console.log("Selected segment:", selectedText);

    // Click import
    await page.click('[role="alertdialog"] button:has-text("Import")');
    await page.waitForTimeout(5000);
  }

  // Show results
  console.log("\n=== API RESPONSES ===");
  for (const r of responses) {
    console.log(`${r.status}: ${JSON.stringify(r.body, null, 2)}`);
  }

  // Final screenshot
  await page.screenshot({ path: "e2e/screenshots/after-import.png", fullPage: true });
});
