import { test, expect } from "@playwright/test";

test("Debug trip full data and day circles", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  console.log("✓ Logged in");

  // Go to plan page and intercept the API call
  let tripFullData: any = null;

  page.on("response", async (response) => {
    if (response.url().includes(`/travel/${tripId}/full`)) {
      try {
        tripFullData = await response.json();
        console.log("\n=== API Response: /travel/trips/{id}/full ===");
        console.log(`Days count: ${tripFullData?.data?.days?.length || 0}`);
        console.log(`Activities count: ${tripFullData?.data?.activities?.length || 0}`);
        console.log(`Segments count: ${tripFullData?.data?.segments?.length || 0}`);

        // Check segment 6 data
        const segment6 = tripFullData?.data?.segments?.find((s: any) => s.segment_number === 6);
        console.log(`\nSegment 6: ${segment6?.name}`);
        console.log(`Segment 6 research_status: ${segment6?.research_status}`);

        // Check days for segment 6
        const segment6Days = tripFullData?.data?.days?.filter((d: any) => d.segment_id === segment6?.id);
        console.log(`\nSegment 6 days: ${segment6Days?.length || 0}`);
        for (const day of segment6Days || []) {
          console.log(`  Day ${day.day_number}: ${day.date} (id: ${day.id})`);
        }

        // Check activities for segment 6
        const segment6Activities = tripFullData?.data?.activities?.filter((a: any) => a.segment_id === segment6?.id);
        console.log(`\nSegment 6 activities: ${segment6Activities?.length || 0}`);

        // Check how many activities have day_id
        const activitiesWithDayId = segment6Activities?.filter((a: any) => a.day_id);
        console.log(`Activities with day_id: ${activitiesWithDayId?.length || 0}`);

        // Check how many activities have date
        const activitiesWithDate = segment6Activities?.filter((a: any) => a.date);
        console.log(`Activities with date: ${activitiesWithDate?.length || 0}`);

        // Simulate what the computation does
        const datesWithActivities = new Set<string>();
        const allDays = tripFullData?.data?.days || [];
        const allActivities = tripFullData?.data?.activities || [];

        for (const activity of allActivities) {
          if (activity.date) {
            const dateStr = activity.date.split('T')[0];
            datesWithActivities.add(dateStr);
          } else if (activity.day_id) {
            const day = allDays.find((d: any) => d.id === activity.day_id);
            if (day?.date) {
              const dateStr = day.date.split('T')[0];
              datesWithActivities.add(dateStr);
            }
          }
        }

        console.log(`\nDates with activities (from computation): ${datesWithActivities.size}`);
        console.log(`Dates: ${Array.from(datesWithActivities).sort().join(', ')}`);

        // Check segment 6 specific dates
        const segment6Dates = ["2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12", "2026-07-13"];
        console.log(`\nSegment 6 date coverage:`);
        for (const date of segment6Dates) {
          console.log(`  ${date}: ${datesWithActivities.has(date) ? "✓ has activities" : "✗ no activities"}`);
        }
      } catch (e) {
        console.log("Failed to parse trip full response");
      }
    }
  });

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  console.log("✓ Plan page loaded");

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/debug-trip-full.png", fullPage: true });

  // Wait a bit for any delayed console output
  await page.waitForTimeout(1000);

  console.log("\n=== DEBUG COMPLETE ===");
});
