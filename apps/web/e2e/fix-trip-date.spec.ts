import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const API_URL = "http://localhost:3002/api/v1";

test("fix trip start_date back to June 14, 2026", async ({ page }) => {
  let capturedToken: string | null = null;

  // Intercept requests to capture the auth token
  await page.route('**/*', async (route) => {
    const headers = route.request().headers();
    if (headers['authorization'] && headers['authorization'].startsWith('Bearer ')) {
      capturedToken = headers['authorization'].replace('Bearer ', '');
    }
    await route.continue();
  });

  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Navigate to trip page - this will trigger API calls with auth headers
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  console.log("\n=== FIX TRIP DATE ===");
  console.log(`Captured token: ${capturedToken ? "Yes (" + capturedToken.substring(0, 20) + "...)" : "No"}`);

  if (!capturedToken) {
    throw new Error("Failed to capture auth token from network requests");
  }

  // Make the API call directly with the captured token
  const result = await page.evaluate(async ({ tripId, apiUrl, token }) => {
    const response = await fetch(`${apiUrl}/travel/trips/${tripId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        start_date: '2026-06-14',
      }),
    });
    return {
      status: response.status,
      data: await response.json(),
    };
  }, { tripId: TRIP_ID, apiUrl: API_URL, token: capturedToken });

  console.log(`API Status: ${result.status}`);
  console.log(`Result:`, JSON.stringify(result.data, null, 2));

  expect(result.status).toBe(200);

  // Verify by reloading
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Check the page shows correct date
  await page.goto(`http://localhost:3000/travel/${TRIP_ID}/details`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "e2e/screenshots/trip-date-fixed.png" });

  const pageContent = await page.textContent("body");
  const hasJun14 = pageContent?.includes("Jun 14") || pageContent?.includes("June 14");
  console.log(`\nPage shows Jun 14: ${hasJun14}`);

  expect(hasJun14).toBe(true);
  console.log("\n✓ Trip start_date restored to 2026-06-14");
});
