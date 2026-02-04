import { test, expect } from "@playwright/test";

test("Check segment 6 UI shows correct data", async ({ page }) => {
  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

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
  await page.waitForTimeout(3000);
  console.log("✓ Plan page loaded");

  await page.screenshot({ path: "e2e/screenshots/segment6-ui-check.png", fullPage: true });

  // Find the Segments step card (has "Segments" title and "Research" column header)
  const segmentsStepCard = page.locator('text=Organize your trip into regional groupings').locator('..').locator('..');
  console.log(`\nSegments step card found: ${await segmentsStepCard.count() > 0}`);

  // Find segment 6 row in the Segments table (not the Basics table)
  // The Segments table has a "Research" column, Basics table does not
  const segmentsTable = page.locator('th:has-text("Research")').locator('..').locator('..').locator('..');
  const segment6Row = segmentsTable.locator('tr').filter({ hasText: /Peneda-Gerês/ });
  const rowText = await segment6Row.textContent();
  console.log(`\nSegment 6 row (from Segments table): ${rowText}`);

  // Count all day circles (they use rounded-sm)
  const allDayCircles = segment6Row.locator('.rounded-sm');
  const totalCircles = await allDayCircles.count();
  console.log(`Total day circles (rounded-sm): ${totalCircles}`);

  // Count green circles in segment 6 row
  const greenCircles = segment6Row.locator('.bg-green-500');
  const greenCount = await greenCircles.count();
  console.log(`Green circles (days with activities): ${greenCount}`);

  // Count purple circles (research complete but no activities)
  const purpleCircles = segment6Row.locator('.bg-purple-500');
  const purpleCount = await purpleCircles.count();
  console.log(`Purple circles: ${purpleCount}`);

  // Count gray circles (no activities, no research)
  const grayCircles = segment6Row.locator('.bg-muted');
  const grayCount = await grayCircles.count();
  console.log(`Gray circles: ${grayCount}`);

  // Dump the entire row's HTML for debugging
  const rowHtml = await segment6Row.innerHTML();
  console.log(`\nRow HTML (first 500 chars): ${rowHtml.substring(0, 500)}...`);

  // Check research status checkmark
  const checkmark = segment6Row.locator('svg.text-purple-500');
  const hasCheckmark = await checkmark.count() > 0;
  console.log(`Research checkmark: ${hasCheckmark}`);

  // Also check the enrichment table in step 4
  console.log("\n=== Enrichment Table (Step 4) ===");
  const enrichmentTable = page.locator('text=Enrichment status').locator('..').locator('table');
  if (await enrichmentTable.isVisible()) {
    const enrichRow6 = enrichmentTable.locator('tr').filter({ hasText: /Peneda-Gerês/ }).first();
    const enrichRowText = await enrichRow6.textContent();
    console.log(`Enrichment row 6: ${enrichRowText}`);
  } else {
    console.log("Enrichment table not visible");
  }

  console.log("\n=== UI CHECK COMPLETE ===");
});
