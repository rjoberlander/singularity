import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("verify flight timezone display", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Go to Plan page
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Set viewport to be larger for better screenshot
  await page.setViewportSize({ width: 1400, height: 900 });

  // Wait for Trip Basics card to load
  await expect(page.locator('text=Trip Basics').first()).toBeVisible({ timeout: 10000 });

  // Wait for flights to load
  await page.waitForTimeout(1000);

  // Take full screenshot
  await page.screenshot({ path: "e2e/screenshots/flight-timezone-full.png", fullPage: false });

  // Try to find and screenshot just the flight section
  const flightSection = page.locator('text=Booked Flights').first();
  if (await flightSection.isVisible()) {
    // Get the parent card
    const flightCard = flightSection.locator('..').locator('..');
    await flightCard.screenshot({ path: "e2e/screenshots/flight-timezone-section.png" });
  }

  // Also get the entire Trip Basics card
  const tripBasicsCard = page.locator('text=Trip Basics').first().locator('xpath=ancestor::div[contains(@class, "rounded")]').first();
  if (await tripBasicsCard.isVisible()) {
    await tripBasicsCard.screenshot({ path: "e2e/screenshots/trip-basics-card.png" });
  }

  console.log("Screenshots saved!");
});
