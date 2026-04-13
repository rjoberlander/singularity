import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";

test("Portugal 2026 plan shows new segment order after reorder", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1600 });

  // Login
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  // Plan page
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/plan`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Full-page screenshot for visual verification
  await page.screenshot({ path: "e2e/screenshots/plan-after-reorder.png", fullPage: true });

  // Extract segment names + dates from visible text on the page and log in order
  const bodyText = await page.locator("body").innerText();

  // Also try to find segment cards / list items if they expose testids or headings
  const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
  console.log("\n=== HEADINGS ON PLAN PAGE ===");
  for (const h of headings) console.log("  " + h.replace(/\n+/g, " | "));

  // Look for each target segment label + its expected date in body text
  const expected = [
    { name: "Lisbon", dates: /Jun\s*15[^A-Za-z]*Jun\s*19/i },
    { name: "Sagres", dates: /Jun\s*19[^A-Za-z]*Jun\s*21/i },
    { name: "Alentejo", dates: /Jun\s*21[^A-Za-z]*Jun\s*26/i },
    { name: "Douro", dates: /Jun\s*26[^A-Za-z]*Jul\s*2/i },
    { name: "Peneda", dates: /Jul\s*2[^A-Za-z]*Jul\s*8/i },
    { name: "Porto", dates: /Jul\s*8[^A-Za-z]*Jul\s*13/i },
    { name: "Airport", dates: /Jul\s*13[^A-Za-z]*Jul\s*14/i },
  ];
  console.log("\n=== SEGMENT PRESENCE CHECK ===");
  for (const e of expected) {
    const nameFound = bodyText.includes(e.name);
    const datesFound = e.dates.test(bodyText);
    console.log(`  ${e.name.padEnd(10)} name=${nameFound ? "✓" : "✗"} dates=${datesFound ? "✓" : "✗"}`);
  }

  // Dump first 3000 chars of body for inspection
  console.log("\n=== BODY TEXT (first 3000 chars) ===");
  console.log(bodyText.slice(0, 3000));
});
