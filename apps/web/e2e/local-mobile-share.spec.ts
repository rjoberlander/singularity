import { test, expect, chromium } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const BASE = "http://localhost:3000";

// iPhone 14 viewport (390x844) on Chromium
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

test("mobile browse with carousel + share button", async ({ page, context }) => {
  test.setTimeout(180_000);

  // ── 1. Login ────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // ── 2. Browse page ──────────────────────────────────────────────
  await page.goto(`${BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Capture top
  await page.screenshot({
    path: "e2e/screenshots/local-browse-top.png",
    fullPage: false,
  });

  // Total scroll height — KEY METRIC
  const beforeScrollHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`MOBILE SCROLL HEIGHT (carousel): ${beforeScrollHeight}px`);

  // Sample a few activity cards
  const cards = page.locator('[data-testid="browse-activity-card"]');
  const cardCount = await cards.count();
  console.log(`activity cards on seg0: ${cardCount}`);

  // Screenshot the first 3 cards
  for (let i = 0; i < Math.min(cardCount, 3); i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.screenshot({
      path: `e2e/screenshots/local-browse-card-${i}.png`,
    });
  }

  // ── 3. Verify the photo carousel exists on activities w/ photos ─
  const photoSets = page.locator('[data-testid="activity-photos"]');
  const photoSetCount = await photoSets.count();
  console.log(`activity-photos elements: ${photoSetCount}`);

  // ── 4. Open the share button ────────────────────────────────────
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // Disable navigator.share so we always fall through to clipboard
  await page.addInitScript(() => {
    // @ts-expect-error - intentional
    delete (navigator as any).share;
  });

  // Reload so the init script applies — actually addInitScript only
  // applies to next nav. Use page.evaluate to remove instead.
  await page.evaluate(() => {
    try {
      // @ts-expect-error
      delete (navigator as any).share;
    } catch {}
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const shareBtn = page.locator('button[title="Share trip"]');
  await expect(shareBtn).toBeVisible({ timeout: 10000 });
  await shareBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shareBtn.click({ force: true });

  // Wait for toast or response
  await page.waitForTimeout(3000);

  // Read clipboard
  let clipboardUrl = "";
  try {
    clipboardUrl = await page.evaluate(() => navigator.clipboard.readText());
  } catch (e) {
    console.log("Clipboard read failed:", (e as Error).message);
  }
  console.log(`SHARE URL: ${clipboardUrl}`);

  // Extract the slug
  const m = clipboardUrl.match(/\/trip\/([^/?#]+)/);
  if (!m) {
    throw new Error(`Share URL didn't match /trip/[token]: ${clipboardUrl}`);
  }
  const slug = m[1];
  console.log(`SLUG: ${slug}`);

  await page.screenshot({
    path: "e2e/screenshots/local-browse-after-share.png",
    fullPage: false,
  });

  // ── 5. Open the public page in a fresh, unauthenticated context ─
  const publicContext = await chromium.launchPersistentContext("", {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  }).catch(async () => {
    // Fallback: create a new context from the existing browser
    return await page.context().browser()!.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
  });

  const publicPage = await publicContext.newPage();
  await publicPage.goto(`${BASE}/trip/${slug}`);
  await publicPage.waitForLoadState("networkidle");
  await publicPage.waitForTimeout(3000);

  await publicPage.screenshot({
    path: "e2e/screenshots/local-public-trip-top.png",
    fullPage: false,
  });

  // Confirm the trip name renders
  const heading = await publicPage.locator("h1").first().textContent().catch(() => null);
  console.log(`PUBLIC PAGE H1: ${heading}`);

  // Verify Browse + Lodging tabs
  const browseTab = publicPage.locator('[data-testid="public-tab-browse"]');
  const lodgingTab = publicPage.locator('[data-testid="public-tab-lodging"]');
  await expect(browseTab).toBeVisible({ timeout: 10000 });
  await expect(lodgingTab).toBeVisible();

  // Public page scroll height
  const publicScrollHeight = await publicPage.evaluate(() => document.body.scrollHeight);
  console.log(`PUBLIC MOBILE SCROLL HEIGHT: ${publicScrollHeight}px`);

  // Click Lodging tab
  await lodgingTab.click();
  await publicPage.waitForTimeout(800);
  await publicPage.screenshot({
    path: "e2e/screenshots/local-public-trip-lodging.png",
    fullPage: false,
  });

  // Switch back to Browse and scroll
  await browseTab.click();
  await publicPage.waitForTimeout(500);
  for (let y = 0; y < 4000; y += 700) {
    await publicPage.evaluate((yy) => window.scrollTo(0, yy), y);
    await publicPage.waitForTimeout(200);
  }
  await publicPage.screenshot({
    path: "e2e/screenshots/local-public-trip-browse-scrolled.png",
    fullPage: false,
  });

  await publicContext.close();
});
