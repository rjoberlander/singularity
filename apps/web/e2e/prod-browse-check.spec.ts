import { test } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const PROD_BASE = "https://singularity.boo";

test("visually inspect production browse page", async ({ page }) => {
  test.setTimeout(180_000);

  // Login
  await page.goto(`${PROD_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Navigate
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Dump console errors
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  // Snapshot top, full page, and each segment
  await page.screenshot({ path: "e2e/screenshots/prod-browse-top.png", fullPage: false });
  await page.screenshot({ path: "e2e/screenshots/prod-browse-full.png", fullPage: true });

  // Dump text content summary
  const title = await page.title();
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  console.log(`TITLE: ${title}`);
  console.log(`H1: ${h1}`);

  // Segment count / structure
  const segLinks = await page.locator('[data-testid^="segment"]').count();
  console.log(`segment elements: ${segLinks}`);

  const cards = await page.locator('[data-testid="browse-activity-card"]').count();
  console.log(`activity cards: ${cards}`);

  const transportBars = await page.locator('[data-testid="transport-bar"]').count();
  console.log(`transport bars: ${transportBars}`);

  const travelHints = await page.locator('[data-testid="travel-hint"]').count();
  console.log(`travel hints: ${travelHints}`);

  // Scroll to bottom in parts to catch render issues
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`scroll height: ${scrollHeight}`);

  for (let y = 0; y < scrollHeight; y += 900) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: "e2e/screenshots/prod-browse-scrolled-full.png", fullPage: true });

  // Click through segments
  const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
  for (let i = 1; i <= 6; i++) {
    if (!(await nextBtn.isEnabled({ timeout: 1000 }).catch(() => false))) break;
    await nextBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `e2e/screenshots/prod-browse-seg-${i}.png`,
      fullPage: true,
    });
  }

  console.log(`\nERRORS (${errors.length}):`);
  errors.forEach((e) => console.log(`  ${e}`));
});
