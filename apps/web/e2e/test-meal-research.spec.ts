import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("Meal Research: click Research on Sagres", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1200 });

  // Login
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  // Go to plan page
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Click "Meal Research" step to expand it
  await page.locator('text=Meal Research').first().click();
  await page.waitForTimeout(2000);

  // Find the per-segment Research buttons (skip index 0 which is the step header)
  const researchButtons = page.locator('button:has-text("Research")');

  // Button at index 1 should be the first segment's Research button
  // Let's log what each one says to find the right one
  const count = await researchButtons.count();
  console.log(`${count} Research buttons found`);

  // Click the first actual per-segment Research button (index 1)
  const btn = researchButtons.nth(1);
  console.log("Clicking Research button...");

  // Listen for network requests to the meal-research endpoint
  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes("meal-research") && resp.request().method() === "POST",
    { timeout: 120_000 }
  );

  await btn.click();
  console.log("Clicked! Waiting for API response...");

  try {
    const response = await responsePromise;
    const status = response.status();
    const body = await response.json();
    console.log(`\nAPI Response: ${status}`);
    console.log(JSON.stringify(body, null, 2));
  } catch (err: any) {
    console.log("Response wait failed:", err.message);
    // Check for toast
    const toasts = page.locator('[data-sonner-toast]');
    const toastCount = await toasts.count();
    if (toastCount > 0) {
      const toastText = await toasts.first().innerText();
      console.log("Toast:", toastText);
    }
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: "e2e/screenshots/meal-research-result.png", fullPage: true });
});
