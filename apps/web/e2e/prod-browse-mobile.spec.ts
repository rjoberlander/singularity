import { test } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const PROD_BASE = "https://singularity.boo";

// iPhone 14 viewport (390x844) — use Chromium so we don't require WebKit install
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

test("iphone mobile view of browse page", async ({ page }) => {
  test.setTimeout(180_000);

  // Login
  await page.goto(`${PROD_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Navigate to browse
  await page.goto(`${PROD_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Log viewport
  const vp = page.viewportSize();
  console.log(`VIEWPORT: ${vp?.width}x${vp?.height}`);

  // Top of page
  await page.screenshot({
    path: "e2e/screenshots/mobile-browse-top.png",
    fullPage: false,
  });

  // Scroll through the page taking viewport-sized shots (full-page too big)
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`scroll height: ${scrollHeight}`);
  let shotIdx = 0;
  for (let y = 0; y < scrollHeight; y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `e2e/screenshots/mobile-browse-scroll-${shotIdx}.png`,
      fullPage: false,
    });
    shotIdx++;
    if (shotIdx > 12) break;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // Scroll to an activity card with photos (third day area)
  const cards = page.locator('[data-testid="browse-activity-card"]');
  const cardCount = await cards.count();
  console.log(`activity cards on seg0: ${cardCount}`);

  // Screenshot a mid-page viewport (activity w/ photos)
  for (let i = 0; i < Math.min(cardCount, 4); i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await card.screenshot({
      path: `e2e/screenshots/mobile-browse-card-${i}.png`,
    });
  }

  // Check header/toolbar area
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "e2e/screenshots/mobile-browse-header.png",
    fullPage: false,
    clip: { x: 0, y: 0, width: vp?.width || 390, height: 500 },
  });

  // Check if share button exists and what it does
  const shareBtn = page.locator('button:has(svg.lucide-share-2)').first();
  const shareExists = await shareBtn.isVisible().catch(() => false);
  console.log(`share button visible: ${shareExists}`);
  if (shareExists) {
    const parent = await shareBtn.evaluate((el) => el.outerHTML);
    console.log(`SHARE BUTTON HTML: ${parent}`);
  }

  // Navigate to segment 2 (smaller / manageable)
  const seg1Tab = page.locator('[data-testid="segment-tab-1"]');
  if (await seg1Tab.isVisible().catch(() => false)) {
    await seg1Tab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: "e2e/screenshots/mobile-browse-seg1-full.png",
      fullPage: true,
    });
  }
});
