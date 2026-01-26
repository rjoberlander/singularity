import { test } from "@playwright/test";

test("Check Pena Palace stored data", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

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
    const activities = tripData.data.activities || [];
    const pena = activities.find((a: any) => a.name?.includes("Pena"));

    if (pena) {
      console.log("=== PENA PALACE FROM DATABASE ===");
      console.log("Name:", pena.name);
      console.log("Has deep_dive:", !!pena.deep_dive);
      console.log("Has kid_engagement:", !!pena.kid_engagement);
      console.log("Has coordinates:", !!(pena.latitude && pena.longitude));

      if (pena.deep_dive) {
        console.log("\n--- deep_dive keys:", Object.keys(pena.deep_dive));
        console.log("\nwhat_it_is:", pena.deep_dive.what_it_is?.slice?.(0, 100) || pena.deep_dive.what_it_is);
        console.log("\nwhy_it_matters type:", typeof pena.deep_dive.why_it_matters);
        if (typeof pena.deep_dive.why_it_matters === 'object') {
          console.log("why_it_matters.content:", pena.deep_dive.why_it_matters?.content?.slice?.(0, 150));
        }
        console.log("\nthe_story type:", typeof pena.deep_dive.the_story);
        if (typeof pena.deep_dive.the_story === 'object') {
          console.log("the_story.content (first 300):", pena.deep_dive.the_story?.content?.slice?.(0, 300));
        }
        console.log("\nwhat_youll_see count:", pena.deep_dive.what_youll_see?.length || 0);
        console.log("interesting_facts count:", pena.deep_dive.interesting_facts?.length || 0);
      }

      if (pena.kid_engagement) {
        console.log("\n--- kid_engagement keys:", Object.keys(pena.kid_engagement));
        console.log("conversation_starters:", pena.kid_engagement.conversation_starters?.length || 0);
        console.log("games:", pena.kid_engagement.games?.length || 0);
      }
    } else {
      console.log("Pena Palace activity not found!");
      console.log("Available activities:", activities.map((a: any) => a.name).slice(0, 10));
    }
  }
});
