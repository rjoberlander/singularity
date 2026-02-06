import { test, expect } from "@playwright/test";

test("Debug enrichment API", async ({ page }) => {
  // Capture console logs and network
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('response', async response => {
    if (response.url().includes('enrich')) {
      const body = await response.text().catch(() => 'could not read body');
      console.log('API Response:', response.url(), response.status(), body.substring(0, 500));
    }
  });

  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]', { force: true });
  await page.waitForURL(/\/(dashboard|rv-locations|biomarkers)/, { timeout: 15000 });

  // Navigate to RV locations
  await page.goto("http://localhost:3000/rv-locations");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Click enrich button
  const enrichButton = page.locator('button:has-text("Enrich")');
  const buttonText = await enrichButton.textContent();
  console.log("Button text:", buttonText);

  if (buttonText && buttonText.includes("(")) {
    console.log("Clicking Enrich...");
    await enrichButton.click();
    await page.waitForTimeout(5000);
    console.log("Done waiting for API response");
  }
});
