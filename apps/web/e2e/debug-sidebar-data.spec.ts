import { test } from "@playwright/test";

test("debug sidebar segment data", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Go to details page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/details");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Check what data is available in the page's React state
  const segmentData = await page.evaluate(() => {
    // Try to find React fiber and get state
    const root = document.getElementById('__next');
    if (!root) return { error: 'No root element' };

    // Check network requests for the trip data
    const perfEntries = performance.getEntriesByType('resource');
    const tripApiCall = perfEntries.find(e => e.name.includes('/trips/') && e.name.includes('/full'));

    return {
      tripApiUrl: tripApiCall?.name || 'not found',
    };
  });

  console.log('Page data:', segmentData);

  // Intercept network response
  let tripData: any = null;

  page.on('response', async (response) => {
    if (response.url().includes('/trips/') && response.url().includes('/full')) {
      try {
        tripData = await response.json();
      } catch (e) {}
    }
  });

  // Reload to capture the API call
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (tripData) {
    // Find Sagres segment
    const sagresSegment = tripData.data?.segments?.find((s: any) => s.name?.includes('Sagres'));

    console.log('\n=== API Response Check ===');
    console.log('Total segments:', tripData.data?.segments?.length);
    console.log('Sagres segment found:', !!sagresSegment);
    console.log('Sagres route_stops:', sagresSegment?.route_stops?.length ?? 'null/undefined');
    console.log('Sagres segment_alternatives:', sagresSegment?.segment_alternatives?.length ?? 'null/undefined');

    if (sagresSegment?.route_stops) {
      console.log('\nRoute stops in API response:');
      sagresSegment.route_stops.forEach((rs: any) => console.log('  -', rs.name));
    } else {
      console.log('\nNo route_stops in segment - checking raw segment keys:');
      console.log('  Keys:', Object.keys(sagresSegment || {}));
    }

    // Check activities
    const backupActivities = tripData.data?.activities?.filter((a: any) => a.is_backup);
    console.log('\nBackup activities:', backupActivities?.length || 0);
    backupActivities?.slice(0, 5).forEach((a: any) => console.log('  -', a.name));
  } else {
    console.log('No trip data captured');
  }
});
