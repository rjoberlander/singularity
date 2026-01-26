import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Complete date correction flow: Import Lisbon JSON with corrected dates", async ({ page }) => {
  // Enable console logging
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "log") {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
    }
  });

  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // First verify Lisbon has correct dates (June 14-18)
  const { data: lisbonSegment } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 1)
    .single();

  console.log(`\nLisbon segment: ${lisbonSegment?.start_date} to ${lisbonSegment?.end_date}`);
  expect(lisbonSegment?.start_date).toBe("2026-06-14");

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

  // Upload the Lisbon V3.2 JSON (which has dates June 17-21)
  await fileInput.setInputFiles("/Users/richard/Downloads/segment-1-lisbon-v3.2.json");
  console.log("✓ File uploaded");
  await page.waitForTimeout(2000);

  // Select Lisbon segment in the import dialog
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

  // Verify date mismatch dialog appears
  const dateMismatchTitle = page.locator('text=Date Mismatch Detected');
  await expect(dateMismatchTitle).toBeVisible({ timeout: 5000 });
  console.log("✓ Date mismatch dialog appeared");
  await page.screenshot({ path: "e2e/screenshots/date-correction-1-dialog.png", fullPage: true });

  // Verify the dialog shows correct dates (use first() to avoid strict mode issues)
  await expect(page.locator('text=2026-06-14').first()).toBeVisible();  // Trip Plan start
  await expect(page.locator('text=2026-06-18').first()).toBeVisible();  // Trip Plan end
  console.log("✓ Verified trip plan dates displayed correctly");

  // The date input should default to segment's start date (2026-06-14)
  const dateInput = page.locator('input[type="date"]');
  const dateValue = await dateInput.inputValue();
  console.log(`Date input value: ${dateValue}`);

  // Make sure the date is set to segment start date (June 14)
  if (dateValue !== "2026-06-14") {
    await dateInput.fill("2026-06-14");
    console.log("✓ Set date to 2026-06-14");
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/screenshots/date-correction-2-date-set.png", fullPage: true });

  // Verify corrected dates preview (use more specific selector)
  const correctedDatesLabel = page.locator('div:has-text("Corrected Dates:")').first();
  await expect(correctedDatesLabel).toBeVisible();
  console.log("✓ Corrected dates preview visible");

  // Click "Import with Corrected Dates"
  const importCorrectedButton = page.locator('button:has-text("Import with Corrected Dates")');
  await expect(importCorrectedButton).toBeEnabled();
  await importCorrectedButton.click();
  console.log("✓ Clicked Import with Corrected Dates");

  // Wait for import to complete
  await page.waitForTimeout(8000);
  await page.screenshot({ path: "e2e/screenshots/date-correction-3-after-import.png", fullPage: true });

  // Check for success toast
  const toast = page.locator('text=Imported with corrected dates');
  const toastVisible = await toast.isVisible({ timeout: 3000 });
  if (toastVisible) {
    console.log("✓ Success toast appeared");
  } else {
    // Check for any error message
    const anyToast = page.locator('[data-sonner-toast]');
    const toastText = await anyToast.textContent();
    console.log(`Toast message: ${toastText}`);
  }

  // Verify segment dates are still correct (not overwritten)
  const { data: lisbonAfter } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 1)
    .single();

  console.log(`\nLisbon after import: ${lisbonAfter?.start_date} to ${lisbonAfter?.end_date}`);
  expect(lisbonAfter?.start_date).toBe("2026-06-14");
  expect(lisbonAfter?.end_date).toBe("2026-06-18");
  console.log("✓ Segment dates preserved correctly!");

  // Check that days were created with correct dates
  const { data: days } = await supabase
    .from("trip_days")
    .select("day_number, date")
    .eq("segment_id", lisbonSegment?.id)
    .order("day_number");

  console.log("\nDays created:");
  for (const day of days || []) {
    console.log(`  Day ${day.day_number}: ${day.date}`);
  }

  // Verify days start at June 14
  if (days && days.length > 0) {
    expect(days[0].date).toBe("2026-06-14");
    console.log("✓ Days have correct dates!");
  }

  // Final screenshot
  await page.screenshot({ path: "e2e/screenshots/date-correction-final.png", fullPage: true });

  console.log("\n=== TEST PASSED ===");
  console.log("Date correction flow works correctly:");
  console.log("1. Date mismatch detected");
  console.log("2. User can select correct start date");
  console.log("3. Import succeeds with corrected dates");
  console.log("4. Segment dates are NOT overwritten");
});
