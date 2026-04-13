import { test } from "@playwright/test";

test("prod: find and screenshot Pena Palace slides", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });

  await page.goto("https://singularity.boo/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15000 });

  await page.goto("https://singularity.boo/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/stories");
  await page.waitForTimeout(5000);

  const container = page.locator('[class*="overflow-y"]').first();

  // Scroll card-by-card checking the center card name
  for (let i = 0; i < 30; i++) {
    const name = await page.evaluate(() => {
      const el = document.elementFromPoint(196, 426);
      const card = el?.closest("[class*='h-full']");
      return card?.querySelector("h3")?.textContent || "";
    });

    if (name.includes("Pena Palace")) {
      console.log(`Found Pena Palace at position ${i}`);
      await page.waitForTimeout(500);

      // Screenshot slide 0
      await page.screenshot({ path: "e2e/screenshots/pena-prod-s0.png" });

      // Click the visible Next button
      const btns = page.locator('button[aria-label="Next photo"]');
      const count = await btns.count();
      console.log(`Found ${count} Next buttons total`);

      // Find the one that's visible and in the viewport
      for (let b = 0; b < Math.min(count, 30); b++) {
        const box = await btns.nth(b).boundingBox();
        if (box && box.y > 300 && box.y < 600 && box.x > 300) {
          console.log(`Clicking Next button at index ${b}, pos: ${Math.round(box.x)},${Math.round(box.y)}`);
          for (let s = 1; s <= 5; s++) {
            await btns.nth(b).click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: `e2e/screenshots/pena-prod-s${s}.png` });
          }
          break;
        }
      }
      break;
    }

    await container.evaluate(el => el.scrollBy({ top: el.clientHeight, behavior: "instant" }));
    await page.waitForTimeout(200);
  }
});
