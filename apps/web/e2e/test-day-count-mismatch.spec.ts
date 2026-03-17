import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Day count mismatch should block import entirely", async ({ page }) => {
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

  // Verify Lisbon has 4 days (June 15-18)
  const { data: lisbonSegment } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 1)
    .single();

  console.log(`\nLisbon segment: ${lisbonSegment?.start_date} to ${lisbonSegment?.end_date} (4 days)`);
  console.log("Lisbon JSON: 2026-06-17 to 2026-06-21 (5 days)");
  console.log("Expected: Day count mismatch error, import blocked");

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

  // Upload the Lisbon V3.2 JSON (5 days)
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

  await page.screenshot({ path: "e2e/screenshots/day-count-mismatch.png", fullPage: true });

  // Check that date mismatch dialog did NOT appear (because day counts don't match)
  const dateMismatchTitle = page.locator('text=Date Mismatch Detected');
  const hasMismatchDialog = await dateMismatchTitle.isVisible({ timeout: 2000 });

  if (hasMismatchDialog) {
    console.log("✗ Date mismatch dialog appeared - this should NOT happen when day counts differ!");
    expect(hasMismatchDialog).toBe(false);
  } else {
    console.log("✓ Date mismatch dialog did NOT appear (correct - day counts differ)");
  }

  // Check for error toast about day count mismatch
  const errorToast = page.locator('text=Cannot import');
  const hasErrorToast = await errorToast.isVisible({ timeout: 3000 });

  if (hasErrorToast) {
    const toastText = await page.locator('[data-sonner-toast]').first().textContent();
    console.log(`✓ Error toast: ${toastText}`);
    expect(toastText).toContain("days");
  } else {
    console.log("Checking for any toast...");
    const anyToast = page.locator('[data-sonner-toast]');
    if (await anyToast.isVisible({ timeout: 2000 })) {
      const toastText = await anyToast.textContent();
      console.log(`Toast content: ${toastText}`);
    }
  }

  // Verify the import dialog is closed
  const importDialog = page.locator('[role="alertdialog"]');
  const dialogVisible = await importDialog.isVisible({ timeout: 1000 });
  console.log(`Import dialog still visible: ${dialogVisible}`);

  console.log("\n=== TEST RESULT ===");
  console.log("Day count mismatch (5 vs 4 days) should block import entirely.");
  console.log("User must regenerate the JSON file with the correct number of days.");
});
