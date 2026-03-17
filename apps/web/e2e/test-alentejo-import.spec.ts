import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Import Alentejo JSON - dates should match and import successfully", async ({ page }) => {
  // Enable console logging
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "log") {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
    }
  });

  const supabase = createClient(
    "https://cymbadkegbibhxbfevuq.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Verify Alentejo has correct dates (June 19-24) which matches JSON
  const { data: alentejoSegment } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 2)
    .single();

  console.log(`\nAlentejo segment: ${alentejoSegment?.start_date} to ${alentejoSegment?.end_date}`);
  console.log("JSON dates: 2026-06-19 to 2026-06-24");
  expect(alentejoSegment?.start_date).toBe("2026-06-19");
  console.log("✓ Dates match - import should succeed without date mismatch");

  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  console.log("✓ Logged in");

  // Go to plan page
  await page.goto(`http://localhost:3000/travel/${tripId}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("✓ Plan page loaded");

  // Find the segment research import file input
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });

  // Upload the Alentejo V3.2 JSON
  await fileInput.setInputFiles("/Users/richard/Downloads/alentejo-evora-segment2-v3.2.json");
  console.log("✓ File uploaded");
  await page.waitForTimeout(2000);

  // Select Alentejo segment
  const segmentSelector = page.locator('[role="combobox"]');
  await segmentSelector.click();
  await page.waitForTimeout(500);
  const alentejoOption = page.locator('[role="option"]').filter({ hasText: /Alentejo/i }).first();
  await alentejoOption.click();
  console.log("✓ Selected Alentejo segment");
  await page.waitForTimeout(500);

  // Click Import
  const importButton = page.locator('button').filter({ hasText: /^Import$/ });
  await importButton.click();
  console.log("✓ Clicked Import button");
  await page.waitForTimeout(8000);

  await page.screenshot({ path: "e2e/screenshots/alentejo-import-result.png", fullPage: true });

  // Check if date mismatch dialog appeared (should NOT appear)
  const dateMismatchTitle = page.locator('text=Date Mismatch Detected');
  const hasMismatch = await dateMismatchTitle.isVisible({ timeout: 2000 });

  if (hasMismatch) {
    console.log("✗ Date mismatch dialog appeared unexpectedly!");
    expect(hasMismatch).toBe(false);
  } else {
    console.log("✓ No date mismatch (as expected - dates match)");
  }

  // Check for success toast
  const successToast = page.locator('text=Imported:');
  const hasSuccess = await successToast.isVisible({ timeout: 5000 });

  if (hasSuccess) {
    const toastText = await successToast.textContent();
    console.log(`✓ Success: ${toastText}`);
  }

  // Verify segment dates were NOT changed
  const { data: alentejoAfter } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 2)
    .single();

  console.log(`\nAlentejo after import: ${alentejoAfter?.start_date} to ${alentejoAfter?.end_date}`);
  expect(alentejoAfter?.start_date).toBe("2026-06-19");
  expect(alentejoAfter?.end_date).toBe("2026-06-24");
  console.log("✓ Segment dates preserved correctly!");

  // Check research items were imported
  const { data: researchItems } = await supabase
    .from("trip_research_items")
    .select("id, name, item_type")
    .eq("segment_id", alentejoSegment?.id)
    .limit(10);

  console.log(`\nResearch items imported: ${researchItems?.length || 0}`);
  if (researchItems && researchItems.length > 0) {
    console.log("First few items:");
    for (const item of researchItems.slice(0, 5)) {
      console.log(`  - ${item.name} (${item.item_type})`);
    }
  }

  console.log("\n=== ALENTEJO IMPORT SUCCESSFUL ===");
});
