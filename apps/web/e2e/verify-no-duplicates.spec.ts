import { test, expect } from "@playwright/test";

test("verify no duplicate photos", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|travel)/, { timeout: 15000 });

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Navigate to details page
  await page.goto(`http://localhost:3000/travel/${tripId}/details`);
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: "e2e/screenshots/no-duplicates.png", fullPage: true });

  // Count occurrences of each place name
  const places = [
    "Pastéis de Belém",
    "National Palace of Pena",
    "Belém Tower",
    "Casa Piriquita",
    "Jerónimos Monastery",
    "Fado Museum"
  ];

  // Scope the search to main content area (right panel) where photos are shown
  const mainContent = page.locator('.flex-1.bg-background');

  console.log("Place name occurrences in photo gallery (should be max 2 each):");
  for (const place of places) {
    // Count place names in the visible overlay text (the <p> elements with class text-[10px])
    // We specifically look for the place name text in photo overlays
    const overlayCount = await mainContent.locator(`p:text-is("${place}")`).count();
    console.log(`  "${place}": ${overlayCount}`);
    // Each place should appear at most 2 times (2 photos per place)
    expect(overlayCount).toBeLessThanOrEqual(2);
  }

  // Count total photos
  const photos = mainContent.locator('img');
  const photoCount = await photos.count();
  console.log(`\nTotal photos displayed: ${photoCount}`);

  // With 13 unique places and 2 photos each, we should have ~26 photos max
  // (or less if some places have fewer photos)
  expect(photoCount).toBeLessThanOrEqual(30);

  // Check for duplicate image URLs - same image should never appear twice
  const imageUrls: string[] = [];
  for (let i = 0; i < photoCount; i++) {
    const src = await photos.nth(i).getAttribute('src');
    if (src) imageUrls.push(src);
  }

  const urlCounts: Record<string, number> = {};
  for (const url of imageUrls) {
    urlCounts[url] = (urlCounts[url] || 0) + 1;
  }

  const duplicateUrls = Object.entries(urlCounts).filter(([, count]) => count > 1);
  if (duplicateUrls.length > 0) {
    console.log("\nDuplicate image URLs found:");
    for (const [url, count] of duplicateUrls) {
      console.log(`  ${url.substring(0, 80)}... appears ${count} times`);
    }
  } else {
    console.log("\nNo duplicate image URLs found");
  }
  expect(duplicateUrls.length).toBe(0);
});
