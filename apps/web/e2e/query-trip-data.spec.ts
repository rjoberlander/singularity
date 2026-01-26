import { test } from "@playwright/test";

test("Query trip data directly", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible", timeout: 10000 });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

  // Get the auth cookie
  const cookies = await page.context().cookies();
  console.log("Cookies:", cookies.map(c => c.name).join(", "));

  // Navigate to get the full trip data
  let tripData: any = null;

  page.on("response", async (response) => {
    if (response.url().includes(`/travel/trips/${tripId}/full`)) {
      try {
        const json = await response.json();
        tripData = json;
      } catch {}
    }
  });

  // Go to overview page which fetches full trip data
  await page.goto(`http://localhost:3000/travel/${tripId}/overview`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  if (tripData) {
    console.log("\n=== TRIP SUMMARY ===");
    console.log(`Segments: ${tripData.data?.segments?.length || 0}`);
    console.log(`Days: ${tripData.data?.days?.length || 0}`);
    console.log(`Activities: ${tripData.data?.activities?.length || 0}`);

    console.log("\n=== SEGMENTS ===");
    for (const seg of tripData.data?.segments || []) {
      console.log(`  ${seg.name} (${seg.id.slice(0,8)}...) - ${seg.start_date} to ${seg.end_date}`);
    }

    console.log("\n=== DAYS ===");
    for (const day of tripData.data?.days || []) {
      console.log(`  Day ${day.day_number}: ${day.date} - ${day.title || 'No title'} (id: ${day.id.slice(0,8)}..., segment: ${day.segment_id?.slice(0,8) || 'null'}...)`);
    }

    console.log("\n=== ACTIVITIES (by day_id) ===");
    const actsByDay: Record<string, any[]> = {};
    for (const act of tripData.data?.activities || []) {
      const dayId = act.day_id || 'unassigned';
      if (!actsByDay[dayId]) actsByDay[dayId] = [];
      actsByDay[dayId].push(act);
    }

    for (const [dayId, acts] of Object.entries(actsByDay)) {
      const day = tripData.data?.days?.find((d: any) => d.id === dayId);
      console.log(`\n  Day ${day?.day_number || '?'} (${day?.date || dayId.slice(0,8)}): ${acts.length} activities`);
      for (const act of acts.slice(0, 5)) {
        console.log(`    - ${act.name} @ ${act.start_time || 'no time'}`);
      }
      if (acts.length > 5) {
        console.log(`    ... and ${acts.length - 5} more`);
      }
    }
  } else {
    console.log("No trip data captured!");
  }

  // Screenshot
  await page.screenshot({ path: "e2e/screenshots/trip-data-check.png", fullPage: true });
});
