import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("debug: show exactly what user sees on browse page", async ({ page }) => {
  test.setTimeout(120_000);

  // Use a realistic desktop viewport
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  // 1. Top of page (what you see when you first land)
  await page.screenshot({
    path: "e2e/screenshots/debug-top-of-browse.png",
    fullPage: false,
  });

  // 2. Find the first day-route-map and report its position
  const firstMap = page.getByTestId("day-route-map").first();
  const mapCount = await page.getByTestId("day-route-map").count();
  console.log(`\nday-route-map cards on page: ${mapCount}`);

  if (mapCount === 0) {
    // Log every element with data-testid on the page for diagnosis
    const testIds = await page.$$eval("[data-testid]", (els) =>
      els.map((e) => e.getAttribute("data-testid")),
    );
    const unique = Array.from(new Set(testIds));
    console.log(`data-testid values on page: ${unique.join(", ")}`);
    const bodyText = await page.locator("body").innerText();
    console.log(`body text first 500 chars: ${bodyText.slice(0, 500)}`);
    await page.screenshot({
      path: "e2e/screenshots/debug-no-map-found.png",
      fullPage: true,
    });
    return;
  }

  const box = await firstMap.boundingBox();
  console.log(`first day-route-map bounding box: ${JSON.stringify(box)}`);

  // 3. Is it visible in current viewport without scrolling?
  const viewport = page.viewportSize();
  const inViewport =
    box && viewport && box.y >= 0 && box.y < viewport.height && box.height > 0;
  console.log(`in initial viewport without scrolling: ${inViewport}`);

  // 4. Scroll it into view and screenshot
  await firstMap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "e2e/screenshots/debug-first-map-in-view.png",
    fullPage: false,
  });
  await firstMap.screenshot({ path: "e2e/screenshots/debug-first-map-only.png" });

  // 5. Full-page screenshot so you can see the whole column including every day
  await page.screenshot({
    path: "e2e/screenshots/debug-full-page.png",
    fullPage: true,
  });

  // 6. HTML classes of first map card to confirm it isn't display:none somehow
  const classes = await firstMap.getAttribute("class");
  const isHidden = await firstMap.evaluate((el) => {
    const style = window.getComputedStyle(el as HTMLElement);
    return {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      height: (el as HTMLElement).offsetHeight,
    };
  });
  console.log(`first map classes: ${classes}`);
  console.log(`first map computed style: ${JSON.stringify(isHidden)}`);

  // 7. Also check what the img src resolves to
  const imgSrc = await firstMap.locator("img").first().getAttribute("src");
  console.log(`first map img src: ${imgSrc?.slice(0, 150)}`);
});
