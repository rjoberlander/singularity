import { test } from "@playwright/test";
import path from "path";

test("Delete existing Lisbon data and re-import", async ({ page }) => {
  // Login first
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Capture auth token
  let token: string | null = null;
  page.on("request", (request) => {
    const auth = request.headers()["authorization"];
    if (auth && auth.startsWith("Bearer ") && !token) {
      token = auth.replace("Bearer ", "");
    }
  });

  // Navigate to trigger API calls
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  console.log("Token found:", !!token);

  // Get Lisbon segment ID
  const tripData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/full", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  const lisbonSegment = tripData.data?.segments?.find((s: any) => s.name === "Lisbon");
  console.log("Lisbon segment ID:", lisbonSegment?.id);

  if (!lisbonSegment) {
    console.log("Lisbon segment not found!");
    return;
  }

  // Delete existing research items for Lisbon
  const itemsData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/research-items", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  const lisbonItems = itemsData.data?.filter((i: any) => i.segment_id === lisbonSegment.id) || [];
  console.log(`Found ${lisbonItems.length} research items for Lisbon`);

  for (const item of lisbonItems) {
    await page.evaluate(async ({ itemId, authToken }) => {
      await fetch(`http://localhost:3002/api/v1/travel/research-items/${itemId}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
    }, { itemId: item.id, authToken: token });
  }
  console.log(`Deleted ${lisbonItems.length} research items`);

  // Delete existing days for Lisbon
  const lisbonDays = tripData.data?.days?.filter((d: any) => d.segment_id === lisbonSegment.id) || [];
  console.log(`Found ${lisbonDays.length} days for Lisbon`);

  for (const day of lisbonDays) {
    await page.evaluate(async ({ dayId, authToken }) => {
      await fetch(`http://localhost:3002/api/v1/travel/days/${dayId}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
    }, { dayId: day.id, authToken: token });
  }
  console.log(`Deleted ${lisbonDays.length} days`);

  // Reset Lisbon segment dates and research_status
  await page.evaluate(async ({ segmentId, authToken }) => {
    await fetch(`http://localhost:3002/api/v1/travel/segments/${segmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        start_date: "2026-06-15",
        end_date: "2026-06-19",
        research_status: "not_started",
      }),
    });
  }, { segmentId: lisbonSegment.id, authToken: token });
  console.log("Reset Lisbon segment dates and research_status");

  // Now re-import
  console.log("\n=== RE-IMPORTING ===\n");

  // Navigate to plan page
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");
  await page.waitForLoadState("networkidle");

  // Find the segments import input
  const fileInput = page.locator('#import-file-segments');
  const filePath = path.resolve("/Users/richard/Downloads/segment-1-lisbon-research.json");

  // Set up response listener
  page.on("response", async (response) => {
    if (response.url().includes("/travel/import")) {
      try {
        const body = await response.json();
        console.log(`API Response: ${response.url()} - ${response.status()}`);
        console.log(`Response body:`, JSON.stringify(body, null, 2));
      } catch (e) {
        console.log(`Failed to parse response`);
      }
    }
  });

  // Upload file
  await fileInput.setInputFiles(filePath);
  await page.waitForTimeout(2500);

  // Dialog should auto-select Lisbon
  const segmentSelect = page.locator('[role="alertdialog"] [role="combobox"]');
  const selectedText = await segmentSelect.textContent();
  console.log(`Auto-selected segment: ${selectedText}`);

  // Click Import
  const importButton = page.locator('[role="alertdialog"] button:has-text("Import")');
  await importButton.click();

  // Wait for import
  await page.waitForTimeout(5000);

  // Check final state
  const finalData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/full", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  const finalLisbon = finalData.data?.segments?.find((s: any) => s.name === "Lisbon");
  const finalDays = finalData.data?.days?.filter((d: any) => d.segment_id === finalLisbon?.id) || [];
  const finalActivities = finalData.data?.activities?.filter((a: any) => {
    const day = finalData.data?.days?.find((d: any) => d.id === a.day_id);
    return day?.segment_id === finalLisbon?.id;
  }) || [];

  console.log("\n=== FINAL STATE ===");
  console.log(`Lisbon dates: ${finalLisbon?.start_date?.split("T")[0]} - ${finalLisbon?.end_date?.split("T")[0]}`);
  console.log(`Lisbon research_status: ${finalLisbon?.research_status}`);
  console.log(`Days: ${finalDays.length}`);
  console.log(`Activities: ${finalActivities.length}`);

  // Show activities
  console.log("\nActivities by day:");
  for (const day of finalDays.sort((a: any, b: any) => a.day_number - b.day_number)) {
    const dayActivities = finalActivities.filter((a: any) => a.day_id === day.id);
    console.log(`  Day ${day.day_number} (${day.title || day.date?.split("T")[0]}): ${dayActivities.length} activities`);
    for (const act of dayActivities.slice(0, 5)) {
      console.log(`    - ${act.start_time || "?"} ${act.name}`);
    }
    if (dayActivities.length > 5) {
      console.log(`    ... and ${dayActivities.length - 5} more`);
    }
  }

  // Take screenshot
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/overview");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "e2e/screenshots/lisbon-with-activities.png", fullPage: true });
  console.log("\nScreenshot saved");
});
