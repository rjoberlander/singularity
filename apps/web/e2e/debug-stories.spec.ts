import { test } from "@playwright/test";

test("verify segment intro mosaic", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });

  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15000 });

  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/stories");
  await page.waitForTimeout(5000);

  const container = page.locator('[class*="overflow-y"]').first();

  // Scroll card-by-card to find "Lisbon History" or "About Lisbon"
  for (let i = 0; i < 10; i++) {
    const name = await page.evaluate(() => {
      const el = document.elementFromPoint(196, 200);
      const card = el?.closest("[class*='h-full']");
      return card?.textContent?.slice(0, 150) || "";
    });
    console.log(`Card ${i}: ${name.slice(0, 60)}`);

    if (name.includes("History") || name.includes("About Lisbon")) {
      console.log("Found segment card!");
      await page.screenshot({ path: "e2e/screenshots/seg-mosaic-0.png" });

      // Check mosaic structure on each slide
      const findNext = async () => {
        const btns = page.locator('button[aria-label="Next photo"]');
        const count = await btns.count();
        for (let b = 0; b < Math.min(count, 20); b++) {
          const box = await btns.nth(b).boundingBox();
          if (box && box.y > 300 && box.y < 550 && box.x > 300) return btns.nth(b);
        }
        return null;
      };

      for (let s = 0; s < 6; s++) {
        // Check ALL imgs on screen (eager loaded = photo background)
        const info = await page.evaluate(() => {
          // Find all eager images
          const imgs = document.querySelectorAll("img[loading='eager']");
          const visibleImgs: string[] = [];
          for (const img of imgs) {
            const rect = img.getBoundingClientRect();
            if (rect.width > 50 && rect.height > 50 && rect.top < 852 && rect.bottom > 0) {
              visibleImgs.push(`${Math.round(rect.width)}x${Math.round(rect.height)} at ${Math.round(rect.left)},${Math.round(rect.top)}`);
            }
          }
          // Check for grid containers
          const grids = document.querySelectorAll("[class*='grid-cols'], [class*='grid-rows']");
          const visibleGrids: string[] = [];
          for (const g of grids) {
            const rect = g.getBoundingClientRect();
            if (rect.width > 50 && rect.top < 852 && rect.bottom > 0) {
              visibleGrids.push(g.className.slice(0, 80));
            }
          }
          return { visibleImgs, visibleGrids };
        });

        const isMosaic = info.visibleImgs.length >= 2;
        console.log(`Slide ${s}: ${info.visibleImgs.length} visible imgs → ${isMosaic ? "MOSAIC" : "SINGLE"}`);
        if (info.visibleImgs.length <= 2) {
          console.log("  imgs:", info.visibleImgs);
        }
        if (info.visibleGrids.length > 0) {
          console.log("  grids:", info.visibleGrids.length);
        }

        await page.screenshot({ path: `e2e/screenshots/seg-mosaic-${s}.png` });

        const btn = await findNext();
        if (!btn) break;
        await btn.click();
        await page.waitForTimeout(500);
      }
      break;
    }

    await container.evaluate(el => el.scrollBy({ top: el.clientHeight, behavior: "instant" }));
    await page.waitForTimeout(250);
  }
});
