import { test, expect } from "@playwright/test";

/**
 * This test cleans up duplicate days and orphaned activities for a trip.
 * It keeps only one day per date per segment, preferring days that have activities.
 */
test("Cleanup duplicate days", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
  const lisbonSegmentId = "ae7c1aaf"; // First 8 chars

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

  if (!tripData?.data) {
    console.log("Failed to get trip data");
    return;
  }

  const days = tripData.data.days || [];
  const activities = tripData.data.activities || [];
  const lisbonSegment = tripData.data.segments?.find((s: any) => s.id.startsWith(lisbonSegmentId));

  if (!lisbonSegment) {
    console.log("Lisbon segment not found");
    return;
  }

  console.log(`\nLisbon segment ID: ${lisbonSegment.id}`);
  console.log(`Total days: ${days.length}`);
  console.log(`Total activities: ${activities.length}`);

  // Group days by date
  const daysByDate: Record<string, any[]> = {};
  for (const day of days) {
    const date = day.date;
    if (!daysByDate[date]) daysByDate[date] = [];
    daysByDate[date].push(day);
  }

  // Count activities per day_id
  const activitiesPerDay: Record<string, number> = {};
  for (const act of activities) {
    activitiesPerDay[act.day_id] = (activitiesPerDay[act.day_id] || 0) + 1;
  }

  console.log("\n=== DAYS BY DATE ===");
  const daysToDelete: string[] = [];
  const daysToKeep: string[] = [];

  for (const [date, dateDays] of Object.entries(daysByDate).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n${date}:`);

    // Sort by preference: segment_id set, then has activities
    const sorted = dateDays.sort((a, b) => {
      // Prefer days with segment_id matching Lisbon
      const aHasSegment = a.segment_id === lisbonSegment.id ? 1 : 0;
      const bHasSegment = b.segment_id === lisbonSegment.id ? 1 : 0;
      if (aHasSegment !== bHasSegment) return bHasSegment - aHasSegment;

      // Then prefer days with activities
      const aActs = activitiesPerDay[a.id] || 0;
      const bActs = activitiesPerDay[b.id] || 0;
      return bActs - aActs;
    });

    // Keep the best day, delete the rest
    for (let i = 0; i < sorted.length; i++) {
      const day = sorted[i];
      const actCount = activitiesPerDay[day.id] || 0;
      const hasSegment = day.segment_id === lisbonSegment.id;
      const action = i === 0 ? "KEEP" : "DELETE";

      console.log(`  ${action}: day_id=${day.id.slice(0,8)}... segment=${hasSegment ? 'Lisbon' : 'null'} activities=${actCount}`);

      if (i === 0) {
        daysToKeep.push(day.id);
      } else {
        daysToDelete.push(day.id);
      }
    }
  }

  console.log(`\n=== CLEANUP SUMMARY ===`);
  console.log(`Days to KEEP: ${daysToKeep.length}`);
  console.log(`Days to DELETE: ${daysToDelete.length}`);

  // Check activities on days to delete
  const activitiesToReassign: any[] = [];
  for (const act of activities) {
    if (daysToDelete.includes(act.day_id)) {
      activitiesToReassign.push(act);
    }
  }
  console.log(`Activities on days being deleted: ${activitiesToReassign.length}`);

  // Output SQL for cleanup
  if (daysToDelete.length > 0) {
    console.log("\n=== SQL TO DELETE DUPLICATE DAYS ===");
    console.log("-- First, delete any activities on these days (or reassign them)");
    console.log(`DELETE FROM trip_activities WHERE day_id IN (`);
    console.log(`  '${daysToDelete.join("',\n  '")}'`);
    console.log(`);`);
    console.log("");
    console.log("-- Then delete the duplicate days");
    console.log(`DELETE FROM trip_days WHERE id IN (`);
    console.log(`  '${daysToDelete.join("',\n  '")}'`);
    console.log(`);`);
  }

  // Check if any kept days have no segment_id but need one
  const keptDaysNoSegment = daysToKeep.filter(dayId => {
    const day = days.find((d: any) => d.id === dayId);
    return day && !day.segment_id;
  });

  if (keptDaysNoSegment.length > 0) {
    console.log("\n=== SQL TO FIX SEGMENT_ID ===");
    console.log(`UPDATE trip_days SET segment_id = '${lisbonSegment.id}'`);
    console.log(`WHERE id IN (`);
    console.log(`  '${keptDaysNoSegment.join("',\n  '")}'`);
    console.log(`);`);
  }
});
