import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Import Lisbon V3.2 JSON with date correction", async ({ page }) => {
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

  // Check current Lisbon segment dates
  const { data: lisbonSegment } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 1)
    .single();

  console.log(`\nLisbon segment in DB: ${lisbonSegment?.start_date} to ${lisbonSegment?.end_date}`);
  console.log("Lisbon JSON file: 2026-06-17 to 2026-06-21");

  // Calculate days
  const dbDays = Math.ceil((new Date(lisbonSegment?.end_date).getTime() - new Date(lisbonSegment?.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const jsonDays = Math.ceil((new Date("2026-06-21").getTime() - new Date("2026-06-17").getTime()) / (1000 * 60 * 60 * 24)) + 1;

  console.log(`DB days: ${dbDays}, JSON days: ${jsonDays}`);
  console.log(`Days match: ${dbDays === jsonDays ? "YES - can use date correction" : "NO - cannot import"}`);

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

  // Upload Lisbon JSON
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles("/Users/richard/Downloads/segment-1-lisbon-v3.2.json");
  console.log("✓ File uploaded");
  await page.waitForTimeout(2000);

  // Select Lisbon segment
  const segmentSelector = page.locator('[role="combobox"]');
  await segmentSelector.click();
  await page.waitForTimeout(500);
  const lisbonOption = page.locator('[role="option"]').filter({ hasText: /Lisbon/i }).first();
  await lisbonOption.click();
  console.log("✓ Selected Lisbon segment");
  await page.waitForTimeout(500);

  // Click Import
  const importButton = page.locator('button').filter({ hasText: /^Import$/ });
  await importButton.click();
  console.log("✓ Clicked Import button");
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "e2e/screenshots/lisbon-import-attempt.png", fullPage: true });

  // Check what dialog appeared
  const dateMismatchTitle = page.locator('text=Date Mismatch Detected');
  const dayCountError = page.locator('text=Cannot import');

  if (await dayCountError.isVisible({ timeout: 2000 })) {
    console.log("❌ Day count mismatch - cannot import");
    const toast = await page.locator('[data-sonner-toast]').first().textContent();
    console.log(`Error: ${toast}`);
  } else if (await dateMismatchTitle.isVisible({ timeout: 2000 })) {
    console.log("✓ Date mismatch dialog appeared - days match, can correct dates");

    // The date should default to segment start date
    const dateInput = page.locator('input[type="date"]');
    const currentValue = await dateInput.inputValue();
    console.log(`Date input default value: ${currentValue}`);

    // Set to segment's correct start date (June 15)
    await dateInput.fill("2026-06-15");
    console.log("✓ Set corrected date to 2026-06-15");
    await page.waitForTimeout(500);

    await page.screenshot({ path: "e2e/screenshots/lisbon-date-correction.png", fullPage: true });

    // Click Import with Corrected Dates
    const importCorrectedBtn = page.locator('button:has-text("Import with Corrected Dates")');
    await importCorrectedBtn.click();
    console.log("✓ Clicked Import with Corrected Dates");

    await page.waitForTimeout(8000);
    await page.screenshot({ path: "e2e/screenshots/lisbon-import-result.png", fullPage: true });

    // Check for success
    const successToast = page.locator('text=Imported');
    if (await successToast.isVisible({ timeout: 5000 })) {
      const toastText = await page.locator('[data-sonner-toast]').first().textContent();
      console.log(`✓ Success: ${toastText}`);
    }

    // Verify segment dates preserved
    const { data: lisbonAfter } = await supabase
      .from("trip_segments")
      .select("start_date, end_date")
      .eq("trip_id", tripId)
      .eq("segment_number", 1)
      .single();

    console.log(`\nLisbon after import: ${lisbonAfter?.start_date} to ${lisbonAfter?.end_date}`);
    expect(lisbonAfter?.start_date).toBe("2026-06-15");
    expect(lisbonAfter?.end_date).toBe("2026-06-19");
    console.log("✓ Segment dates preserved correctly!");

    // Check days
    const { data: days } = await supabase
      .from("trip_days")
      .select("day_number, date")
      .eq("segment_id", lisbonSegment?.id)
      .order("day_number");

    console.log("\nDays after import:");
    for (const day of days || []) {
      console.log(`  Day ${day.day_number}: ${day.date}`);
    }
  } else {
    console.log("No dialog appeared - checking for direct success or error");
    const anyToast = page.locator('[data-sonner-toast]');
    if (await anyToast.isVisible({ timeout: 3000 })) {
      const toastText = await anyToast.textContent();
      console.log(`Toast: ${toastText}`);
    }
  }

  console.log("\n=== IMPORT TEST COMPLETE ===");
});
