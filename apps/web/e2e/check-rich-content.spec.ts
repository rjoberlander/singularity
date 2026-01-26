import { test } from "@playwright/test";

test("Check rich content in activities", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Capture trip data
  let tripData: any = null;
  page.on("response", async (response) => {
    if (response.url().includes(`/travel/trips/${tripId}/full`)) {
      try {
        tripData = await response.json();
      } catch {}
    }
  });

  await page.goto(`http://localhost:3000/travel/${tripId}/overview`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  if (tripData?.data) {
    console.log("\n=== ACTIVITIES WITH RICH CONTENT ===");
    const activities = tripData.data.activities || [];

    // Find activities with deep_dive
    const withDeepDive = activities.filter((a: any) => a.deep_dive);
    const withKidEngagement = activities.filter((a: any) => a.kid_engagement);
    const withLocation = activities.filter((a: any) => a.latitude && a.longitude);

    console.log(`\nTotal activities: ${activities.length}`);
    console.log(`With deep_dive: ${withDeepDive.length}`);
    console.log(`With kid_engagement: ${withKidEngagement.length}`);
    console.log(`With coordinates: ${withLocation.length}`);

    console.log("\n--- Sample activities with deep_dive ---");
    for (const act of withDeepDive.slice(0, 3)) {
      console.log(`\n${act.name}:`);
      console.log(`  deep_dive keys: ${Object.keys(act.deep_dive || {}).join(', ')}`);
      if (act.deep_dive?.what_it_is) {
        console.log(`  what_it_is: ${act.deep_dive.what_it_is.slice(0, 100)}...`);
      }
    }

    console.log("\n--- Sample activities with kid_engagement ---");
    for (const act of withKidEngagement.slice(0, 3)) {
      console.log(`\n${act.name}:`);
      console.log(`  kid_engagement keys: ${Object.keys(act.kid_engagement || {}).join(', ')}`);
      if (act.kid_engagement?.parker) {
        console.log(`  parker: ${act.kid_engagement.parker.slice(0, 80)}...`);
      }
    }
  }

  await page.screenshot({ path: "e2e/screenshots/rich-content-check.png", fullPage: true });
});
