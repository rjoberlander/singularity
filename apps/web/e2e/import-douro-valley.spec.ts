import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test("Import Douro Valley V3.2 JSON", async ({ page }) => {
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

  // Check current Douro Valley segment dates
  const { data: douroSegment } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 4)
    .single();

  console.log(`\nDouro Valley segment in DB: ${douroSegment?.start_date} to ${douroSegment?.end_date}`);
  console.log("Douro Valley JSON file: 2026-06-26 to 2026-07-02");

  const datesMatch = douroSegment?.start_date === "2026-06-26" && douroSegment?.end_date === "2026-07-02";
  console.log(`Dates match: ${datesMatch ? "YES - direct import" : "NO - will need correction"}`);

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

  // Upload Douro Valley JSON
  const fileInput = page.locator('input#import-file-segments');
  await expect(fileInput).toBeAttached({ timeout: 5000 });
  await fileInput.setInputFiles("/Users/richard/Downloads/douro-valley-segment-4-v3.2.json");
  console.log("✓ File uploaded");
  await page.waitForTimeout(2000);

  // Select Douro Valley segment
  const segmentSelector = page.locator('[role="combobox"]');
  await segmentSelector.click();
  await page.waitForTimeout(500);
  const douroOption = page.locator('[role="option"]').filter({ hasText: /Douro/i }).first();
  await douroOption.click();
  console.log("✓ Selected Douro Valley segment");
  await page.waitForTimeout(500);

  // Click Import
  const importButton = page.locator('button').filter({ hasText: /^Import$/ });
  await importButton.click();
  console.log("✓ Clicked Import button");
  await page.waitForTimeout(5000);

  await page.screenshot({ path: "e2e/screenshots/douro-import-result.png", fullPage: true });

  // Check for success or any dialogs
  const dateMismatchTitle = page.locator('text=Date Mismatch Detected');
  const dayCountError = page.locator('text=Cannot import');

  if (await dayCountError.isVisible({ timeout: 2000 })) {
    console.log("❌ Day count mismatch error");
    const toast = await page.locator('[data-sonner-toast]').first().textContent();
    console.log(`Error: ${toast}`);
  } else if (await dateMismatchTitle.isVisible({ timeout: 2000 })) {
    console.log("⚠ Date mismatch dialog appeared - need to correct dates");
  } else {
    // Check for success toast
    const successToast = page.locator('[data-sonner-toast]');
    if (await successToast.isVisible({ timeout: 3000 })) {
      const toastText = await successToast.first().textContent();
      console.log(`✓ Result: ${toastText}`);
    }
  }

  // Verify data was imported
  const { data: researchItems } = await supabase
    .from("trip_research_items")
    .select("id, name, item_type")
    .eq("segment_id", douroSegment?.id)
    .limit(10);

  const { data: days } = await supabase
    .from("trip_days")
    .select("day_number, date")
    .eq("segment_id", douroSegment?.id)
    .order("day_number");

  console.log(`\nResearch items: ${researchItems?.length || 0}`);
  if (researchItems && researchItems.length > 0) {
    console.log("Sample items:");
    for (const item of researchItems.slice(0, 5)) {
      console.log(`  - ${item.name} (${item.item_type})`);
    }
  }

  console.log(`\nDays: ${days?.length || 0}`);
  for (const day of days || []) {
    console.log(`  Day ${day.day_number}: ${day.date}`);
  }

  // Verify segment dates unchanged
  const { data: douroAfter } = await supabase
    .from("trip_segments")
    .select("start_date, end_date")
    .eq("trip_id", tripId)
    .eq("segment_number", 4)
    .single();

  console.log(`\nDouro Valley after import: ${douroAfter?.start_date} to ${douroAfter?.end_date}`);

  console.log("\n=== DOURO VALLEY IMPORT COMPLETE ===");
});
