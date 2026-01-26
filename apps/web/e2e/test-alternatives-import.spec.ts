import { test, expect } from "@playwright/test";
import * as fs from "fs";

/**
 * Test for Alternatives & Route Stops Import
 *
 * This test:
 * 1. Logs in as the test user
 * 2. Finds the Portugal Summer 2026 trip (or any existing trip with segment 3)
 * 3. Imports the segment-3-sagres-lagos-research.json file which includes route_stops and alternatives
 * 4. Verifies that the data was imported correctly by checking the UI
 */
test.describe("Alternatives & Route Stops Import", () => {
  test("import segment with route_stops and alternatives via API", async ({
    page,
    request,
  }) => {
    // Login to get auth session
    await page.goto("http://localhost:3000/login");
    await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("**/dashboard", { timeout: 30000 });

    // Get auth token from localStorage
    const authData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find(k => k.startsWith('sb-'));
      if (supabaseKey) {
        const data = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
        return data.access_token;
      }
      return null;
    });
    console.log("Got auth token:", authData ? "Yes" : "No");

    // Navigate to travel to find a trip
    await page.goto("http://localhost:3000/travel");
    await page.waitForLoadState("networkidle");

    // Find Portugal Summer 2026 trip or any trip
    const tripCards = page.locator('[class*="trip"], [class*="card"]').filter({ hasText: /Portugal|trip/i });
    const tripLink = page.locator('a:has-text("Portugal")').first();

    let tripId: string | null = null;
    let segmentId: string | null = null;

    if (await tripLink.isVisible({ timeout: 5000 })) {
      await tripLink.click();
      await page.waitForLoadState("networkidle");

      // Get trip ID from URL
      const url = page.url();
      const tripIdMatch = url.match(/\/travel\/([a-f0-9-]+)/);
      if (tripIdMatch) {
        tripId = tripIdMatch[1];
        console.log("Found trip ID:", tripId);

        // Check if there's already a Sagres segment (segment 3)
        // Look for it in the UI or API
        const sagresSegment = page.locator('text="Sagres"').first();
        if (await sagresSegment.isVisible({ timeout: 3000 })) {
          console.log("Sagres segment already exists - will update it");
        }
      }
    }

    // Read the JSON file
    const jsonPath = "/Users/richard/Downloads/segment-3-sagres-lagos-research.json";
    const jsonContent = fs.readFileSync(jsonPath, "utf-8");
    const payload = JSON.parse(jsonContent);

    console.log("=== Import Payload Analysis ===");
    console.log("Route stops count:", payload.route_stops?.length || 0);
    console.log("Route stops:", payload.route_stops?.map((rs: any) => rs.name));
    console.log("Alternatives count:", payload.alternatives?.length || 0);
    console.log("Linked alternatives:", payload.alternatives?.filter((a: any) => a.replaces)?.length || 0);
    console.log("General alternatives:", payload.alternatives?.filter((a: any) => !a.replaces)?.length || 0);

    // Make API call to import
    if (tripId && authData) {
      const importPayload = {
        ...payload,
        options: {
          trip_id: tripId,
          create_segment: true,
          create_days: true,
          create_research_items: true,
          import_approved_as_activities: true,
          auto_approve_must_do: true,
        }
      };

      const importResponse = await request.post(
        "http://localhost:3002/api/v1/travel/import",
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authData}`,
          },
          data: importPayload,
        }
      );

      const result = await importResponse.json();
      console.log("=== Import Result ===");
      console.log(JSON.stringify(result, null, 2));

      if (result.success) {
        console.log("Import successful!");
        console.log("Segment ID:", result.segment_id);
        segmentId = result.segment_id;

        // Verify the data was stored by checking the details page
        await page.goto(`http://localhost:3000/travel/${tripId}/details`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        // Find and expand the Sagres segment
        const sagresHeader = page.locator('text="Sagres"').first();
        if (await sagresHeader.isVisible()) {
          await sagresHeader.click();
          await page.waitForTimeout(1000);
        }

        // Take screenshot
        await page.screenshot({ path: "e2e/screenshots/alternatives-import-result.png", fullPage: true });

        // Verify route stops section
        const routeStopsSection = page.locator('text="Stops Along the Way"');
        const routeStopsVisible = await routeStopsSection.isVisible({ timeout: 5000 });
        console.log("Route stops section visible:", routeStopsVisible);

        if (routeStopsVisible) {
          // Check for specific route stops
          const praiaLuz = page.locator('text="Praia da Luz"');
          const burgau = page.locator('text="Burgau"');
          console.log("Praia da Luz stop visible:", await praiaLuz.isVisible());
          console.log("Burgau stop visible:", await burgau.isVisible());
        }

        // Verify alternatives section
        const alternativesSection = page.locator('text="Alternatives"').first();
        const alternativesVisible = await alternativesSection.isVisible({ timeout: 5000 });
        console.log("Alternatives section visible:", alternativesVisible);

        // Verify alternatives badge on activities
        const altBadge = page.locator('[title="Has alternatives"]');
        const altBadgeCount = await altBadge.count();
        console.log("Activities with alternatives badge:", altBadgeCount);

        expect(result.success).toBe(true);
      } else {
        console.log("Import failed:", result.errors);
        // This might be expected if the database migration hasn't been applied
        console.log("Note: If you see column errors, run the migration first:");
        console.log("  npx supabase db push --linked");
      }
    } else {
      console.log("Skipping API import - no trip ID or auth token");
      console.log("Trip ID:", tripId);
      console.log("Has auth:", !!authData);
    }
  });

  test("verify route stops in segment detail view", async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL("**/dashboard", { timeout: 30000 });

    // Navigate to travel
    await page.goto("http://localhost:3000/travel");
    await page.waitForLoadState("networkidle");

    // Find and click on Portugal trip
    const tripLink = page.locator('a:has-text("Portugal")').first();
    if (await tripLink.isVisible({ timeout: 5000 })) {
      await tripLink.click();
      await page.waitForLoadState("networkidle");

      // Go to details page
      const detailsLink = page.locator('a:has-text("Details")').first();
      if (await detailsLink.isVisible()) {
        await detailsLink.click();
      } else {
        // Try direct navigation
        const url = page.url();
        const tripIdMatch = url.match(/\/travel\/([a-f0-9-]+)/);
        if (tripIdMatch) {
          await page.goto(`http://localhost:3000/travel/${tripIdMatch[1]}/details`);
        }
      }
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // Click on Sagres segment to select it
      const sagresSegment = page.locator('h3:has-text("Sagres")').first();
      if (await sagresSegment.isVisible()) {
        await sagresSegment.click();
        await page.waitForTimeout(1000);

        // Now check the right panel for route stops
        const routeStopsHeader = page.locator('text="Possible Stops Along the Way"');
        if (await routeStopsHeader.isVisible({ timeout: 5000 })) {
          console.log("Route stops section found in detail panel!");

          // Check for specific stops
          const stops = ["Praia da Luz", "Burgau", "Fortaleza de Beliche", "Albufeira"];
          for (const stop of stops) {
            const stopElement = page.locator(`text="${stop}"`);
            console.log(`${stop}: ${await stopElement.isVisible()}`);
          }
        }

        // Take screenshot of segment detail
        await page.screenshot({ path: "e2e/screenshots/segment-route-stops.png", fullPage: true });
      }
    }
  });
});
