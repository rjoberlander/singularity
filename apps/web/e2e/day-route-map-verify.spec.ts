import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const APP_BASE = "http://localhost:3000";
const API_BASE = "http://localhost:3002/api/v1";

test("all day route maps render across every segment", async ({ page }) => {
  test.setTimeout(300_000);

  const mapResponses: Array<{ url: string; status: number; contentType?: string }> = [];
  const mapFailures: Array<{ url: string; failure: string }> = [];
  page.on("response", (resp) => {
    if (resp.url().includes("/travel/maps/static")) {
      mapResponses.push({
        url: resp.url(),
        status: resp.status(),
        contentType: resp.headers()["content-type"],
      });
    }
  });
  page.on("requestfailed", (req) => {
    if (req.url().includes("/travel/maps/static")) {
      mapFailures.push({ url: req.url(), failure: req.failure()?.errorText || "unknown" });
    }
  });

  // Log in
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Iterate every segment tab
  const segmentTabs = page.getByTestId(/^segment-tab-\d+$/);
  const segmentCount = await segmentTabs.count();
  console.log(`\n=== Trip has ${segmentCount} segments ===\n`);
  expect(segmentCount).toBeGreaterThan(0);

  const summary: Array<{
    segment: number;
    dayIndex: number;
    stops: number;
    imgOk: boolean;
    imgWidth: number;
    hasDirUrl: boolean;
  }> = [];

  for (let s = 0; s < segmentCount; s++) {
    await segmentTabs.nth(s).click();
    await page.waitForTimeout(800); // allow re-render

    const segName = await page.locator('[data-testid="segment-header"] h2').first().textContent();
    const maps = page.getByTestId("day-route-map");
    const mapCount = await maps.count();
    console.log(`Segment ${s + 1}: "${segName?.trim()}" → ${mapCount} day-route-map card(s)`);

    for (let d = 0; d < mapCount; d++) {
      const card = maps.nth(d);
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      const img = card.locator("img").first();
      // Wait for image load (or error)
      const loadRes = await img.evaluate((node: HTMLImageElement) => {
        if (node.complete && node.naturalWidth > 0) {
          return { ok: true, width: node.naturalWidth };
        }
        return new Promise<{ ok: boolean; width: number; error?: string }>((resolve) => {
          node.addEventListener(
            "load",
            () => resolve({ ok: true, width: node.naturalWidth }),
            { once: true },
          );
          node.addEventListener(
            "error",
            () => resolve({ ok: false, width: 0, error: "img error event" }),
            { once: true },
          );
          setTimeout(() => resolve({ ok: false, width: 0, error: "timeout" }), 15_000);
        });
      });

      const stopsLocator = card.getByTestId("day-route-stops").locator("li");
      const stopCount = await stopsLocator.count();

      const openLink = card.getByTestId("day-route-open-maps");
      const href = (await openLink.getAttribute("href")) || "";
      const hasDirUrl =
        href.includes("google.com/maps/dir") &&
        href.includes("origin=") &&
        href.includes("destination=");

      summary.push({
        segment: s + 1,
        dayIndex: d + 1,
        stops: stopCount,
        imgOk: loadRes.ok,
        imgWidth: loadRes.width,
        hasDirUrl,
      });

      console.log(
        `  Day ${d + 1}: ${stopCount} stops, img=${loadRes.ok ? "OK" : "FAIL"} w=${loadRes.width}, dir=${hasDirUrl ? "ok" : "MISSING"}`,
      );

      // Screenshot first map of each segment
      if (d === 0) {
        await card.screenshot({
          path: `e2e/screenshots/day-route-seg${s + 1}-day${d + 1}.png`,
        });
      }

      expect(loadRes.ok, `segment ${s + 1} day ${d + 1} image should load`).toBe(true);
      expect(loadRes.width, `segment ${s + 1} day ${d + 1} naturalWidth > 0`).toBeGreaterThan(0);
      expect(stopCount, `segment ${s + 1} day ${d + 1} stop count >= 2`).toBeGreaterThanOrEqual(2);
      expect(hasDirUrl, `segment ${s + 1} day ${d + 1} Open-in-Maps href`).toBe(true);
    }
  }

  console.log("\n=== Summary ===");
  const totalMaps = summary.length;
  const ok = summary.filter((r) => r.imgOk && r.hasDirUrl).length;
  console.log(`Total day-route maps rendered across all segments: ${totalMaps}`);
  console.log(`Fully working (image + directions link): ${ok} / ${totalMaps}`);
  console.log(`Static-maps proxy responses: ${mapResponses.length} (OK=${mapResponses.filter((r) => r.status === 200).length})`);
  console.log(`Static-maps failures: ${mapFailures.length}`);
  if (mapFailures.length) {
    mapFailures.slice(0, 5).forEach((f) => console.log(`  ${f.failure}`));
  }

  expect(totalMaps).toBeGreaterThan(0);
  expect(ok).toBe(totalMaps);
  expect(mapFailures.length).toBe(0);
});

test("day route maps render on browse page", async ({ page }) => {
  test.setTimeout(120_000);

  // Track every request to the static-maps proxy so we can assert it got hit
  const mapRequests: Array<{ url: string; status?: number; contentType?: string }> = [];
  const failedRequests: Array<{ url: string; failure: string }> = [];
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("/travel/maps/static")) {
      mapRequests.push({
        url,
        status: resp.status(),
        contentType: resp.headers()["content-type"],
      });
    }
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes("/travel/maps/static") || url.includes(":3002")) {
      failedRequests.push({
        url,
        failure: req.failure()?.errorText || "unknown",
      });
    }
  });
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" || text.includes("maps") || text.includes("CORS")) {
      console.log(`[browser ${msg.type()}] ${text}`);
    }
  });

  // Log in
  await page.goto(`${APP_BASE}/login`);
  await page.fill('input[placeholder="you@example.com"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  // Navigate to browse
  await page.goto(`${APP_BASE}/travel/${TRIP_ID}/browse`);
  await page.waitForLoadState("networkidle");
  // Give the browse page time to render all days
  await page.waitForTimeout(2000);

  // At least one day-route-map card should exist
  const maps = page.getByTestId("day-route-map");
  const mapCount = await maps.count();
  console.log(`Found ${mapCount} day-route-map cards`);
  expect(mapCount).toBeGreaterThan(0);

  // First map should have an image that loaded successfully
  const firstMap = maps.first();
  await firstMap.scrollIntoViewIfNeeded();
  await expect(firstMap).toBeVisible();
  const firstImg = firstMap.locator("img").first();
  await expect(firstImg).toBeVisible();

  const imgSrc = await firstImg.getAttribute("src");
  console.log(`First map image src: ${imgSrc}`);

  // Wait for the <img> to finish loading or error out
  const loadResult = await firstImg.evaluate((img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return { ok: true, width: img.naturalWidth };
    return new Promise<{ ok: boolean; width: number; error?: string }>((resolve) => {
      img.addEventListener(
        "load",
        () => resolve({ ok: true, width: img.naturalWidth }),
        { once: true },
      );
      img.addEventListener(
        "error",
        () => resolve({ ok: false, width: 0, error: "img error event" }),
        { once: true },
      );
      setTimeout(() => resolve({ ok: false, width: 0, error: "timeout" }), 15_000);
    });
  });
  console.log(`Image load result: ${JSON.stringify(loadResult)}`);

  console.log(`Static map proxy requests captured: ${mapRequests.length}`);
  mapRequests.forEach((r, i) =>
    console.log(`  [${i}] ${r.status} ${r.contentType} :: ${r.url.slice(0, 200)}`),
  );
  console.log(`Failed requests: ${failedRequests.length}`);
  failedRequests.forEach((r, i) =>
    console.log(`  [${i}] ${r.failure} :: ${r.url.slice(0, 200)}`),
  );

  expect(loadResult.ok).toBe(true);
  expect(loadResult.width).toBeGreaterThan(0);

  // "Open in Maps" link should have a google.com/maps/dir URL
  const openLink = firstMap.getByTestId("day-route-open-maps");
  await expect(openLink).toBeVisible();
  const href = await openLink.getAttribute("href");
  console.log(`Open-in-Maps href: ${href}`);
  expect(href).toMatch(/google\.com\/maps\/dir/);
  expect(href).toMatch(/origin=/);
  expect(href).toMatch(/destination=/);

  // At least one stop listed
  const stops = firstMap.getByTestId("day-route-stops").locator("li");
  const stopCount = await stops.count();
  console.log(`First map stop count: ${stopCount}`);
  expect(stopCount).toBeGreaterThanOrEqual(2);

  // Proxy endpoint was actually hit and returned a PNG
  console.log(`Static map proxy requests: ${mapRequests.length}`);
  mapRequests.slice(0, 3).forEach((r) =>
    console.log(`  ${r.status} ${r.contentType}`),
  );
  expect(mapRequests.length).toBeGreaterThan(0);
  const okProxy = mapRequests.filter(
    (r) => r.status === 200 && (r.contentType || "").includes("image"),
  );
  expect(okProxy.length).toBeGreaterThan(0);

  // Screenshot for visual confirmation
  await firstMap.screenshot({ path: "e2e/screenshots/day-route-map-first.png" });
  await page.screenshot({ path: "e2e/screenshots/day-route-map-full.png", fullPage: true });
});
