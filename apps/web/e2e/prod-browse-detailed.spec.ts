import { test } from "@playwright/test";
import fs from "fs";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const PROD_BASE = "https://singularity.boo";

test("detailed inspection of browse page", async ({ page }) => {
  test.setTimeout(180_000);

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => {
    errors.push(`reqfail: ${req.failure()?.errorText} ${req.url().substring(0, 120)}`);
  });

  // Login
  await page.goto(`${PROD_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Load browse page
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PROD_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Collect structured data for each card to diagnose
  const cards = await page.locator('[data-testid="browse-activity-card"]').all();
  console.log(`\n=== ${cards.length} activity cards ===`);

  const summary: any[] = [];
  for (let i = 0; i < Math.min(cards.length, 30); i++) {
    const card = cards[i];
    try {
      const text = (await card.innerText()).replace(/\s+/g, " ").substring(0, 200);
      const hasPhoto = (await card.locator("img").count()) > 0;
      const hasStar = (await card.locator("svg.lucide-star").count()) > 0;
      const hasRating = (await card.locator("text=/\\d+\\.\\d+.*\\(\\d+\\)/").count()) > 0;
      summary.push({ i, hasPhoto, hasStar, hasRating, text });
      console.log(`[${i}] photo=${hasPhoto} star=${hasStar} rating=${hasRating} :: ${text}`);
    } catch (e) {
      console.log(`[${i}] ERROR reading card`);
    }
  }
  fs.writeFileSync("e2e/screenshots/prod-browse-cards.json", JSON.stringify(summary, null, 2));

  // Scroll in steps taking viewport screenshots
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log(`\nscroll height: ${scrollHeight}`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "e2e/screenshots/prod-br-0.png" });

  const step = 800;
  let idx = 1;
  for (let y = step; y < scrollHeight; y += step) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `e2e/screenshots/prod-br-${idx}.png` });
    idx++;
    if (idx > 30) break;
  }

  // Visit each segment
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Find segment selector (pills or buttons)
  const segButtons = await page.locator('button:has(svg.lucide-chevron-right)').all();
  console.log(`segment next buttons: ${segButtons.length}`);

  for (let s = 1; s <= 6; s++) {
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();
    if (!(await nextBtn.isEnabled({ timeout: 1000 }).catch(() => false))) break;
    await nextBtn.click();
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/screenshots/prod-seg${s}-top.png` });
    // mid
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `e2e/screenshots/prod-seg${s}-mid.png` });
  }

  console.log(`\nERRORS (${errors.length}):`);
  errors.slice(0, 30).forEach((e) => console.log(`  ${e}`));
});
