import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

test("Activities Only toggle filters logistics", async ({ page }) => {
  await page.goto("http://localhost:3000/login");
  await page.fill('#email', "rjoberlander@gmail.com");
  await page.fill('#password', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });

  // Navigate to trip details
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await page.setViewportSize({ width: 1600, height: 1000 });

  // Count activities before toggle
  const beforeToggle = await page.locator('text=Arrive Lisbon Airport').count();
  console.log("Before toggle - 'Arrive Lisbon Airport' visible:", beforeToggle);

  const driveToHotel = await page.locator('text=Drive to hotel').count();
  console.log("Before toggle - 'Drive to hotel' visible:", driveToHotel);

  const pasteisCount = await page.locator('text=Pastéis de Belém').count();
  console.log("Before toggle - 'Pastéis de Belém' visible:", pasteisCount);

  // Take screenshot before toggle
  await page.screenshot({ path: "e2e/screenshots/toggle-off.png", fullPage: true });

  // Find and click the toggle
  const toggle = page.locator('#hide-logistics');
  await toggle.click();
  await page.waitForTimeout(500);

  // Count activities after toggle
  const afterToggleAirport = await page.locator('text=Arrive Lisbon Airport').count();
  console.log("After toggle - 'Arrive Lisbon Airport' visible:", afterToggleAirport);

  const afterToggleDrive = await page.locator('text=Drive to hotel').count();
  console.log("After toggle - 'Drive to hotel' visible:", afterToggleDrive);

  const afterTogglePasteis = await page.locator('text=Pastéis de Belém').count();
  console.log("After toggle - 'Pastéis de Belém' visible:", afterTogglePasteis);

  // Take screenshot after toggle
  await page.screenshot({ path: "e2e/screenshots/toggle-on.png", fullPage: true });

  // Logistics should be hidden, activities should remain
  expect(afterToggleAirport).toBe(0);
  expect(afterToggleDrive).toBe(0);
  expect(afterTogglePasteis).toBeGreaterThan(0);
});
