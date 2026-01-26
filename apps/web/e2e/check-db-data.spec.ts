import { test } from "@playwright/test";

test("Check database data via API", async ({ request }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login first to get auth token
  const loginResponse = await request.post("http://localhost:3000/api/auth/callback/credentials", {
    form: {
      email: "rjoberlander@gmail.com",
      password: "Cookie123!",
    }
  });

  // Use the API directly to check trip data
  // We'll check via page navigation instead
});

test("Check trip data via UI", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Intercept API calls to see the data
  const tripData: any[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/travel") && response.status() === 200) {
      try {
        const json = await response.json();
        tripData.push({ url, data: json });
      } catch {}
    }
  });

  // Go to overview page
  await page.goto(`http://localhost:3000/travel/${tripId}/overview`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  console.log("\n=== TRIP DATA ===");
  for (const item of tripData) {
    console.log(`\nURL: ${item.url}`);
    console.log(JSON.stringify(item.data, null, 2).slice(0, 5000));
  }

  // Check segment info
  const segments = await page.locator('[data-segment-id]').all();
  console.log(`\nFound ${segments.length} segments on page`);

  // Check day sections
  const days = await page.locator('h3, h4').allTextContents();
  console.log("\nDay headers found:");
  days.filter(d => d.includes("Day") || d.includes("Jun")).forEach(d => console.log(`  - ${d}`));

  // Check activities
  const activities = await page.locator('[class*="activity"], [data-activity]').all();
  console.log(`\nFound ${activities.length} activity elements`);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/db-check.png", fullPage: true });
});
