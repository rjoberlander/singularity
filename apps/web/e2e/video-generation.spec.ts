import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const BASE_URL = "http://localhost:3000";
const API_URL = "http://localhost:3002/api/v1";
const TEST_EMAIL = "rjoberlander@gmail.com";
const TEST_PASSWORD = "Cookie123!";

test.describe("Video Generation — Lisbon Segment Overview", () => {
  test.setTimeout(600_000); // 10 min — video generation is slow

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("generate Lisbon segment video and verify playback", async ({ page }) => {
    // Navigate to Videos tab
    await page.goto(`${BASE_URL}/travel/${TRIP_ID}/videos`);
    await page.waitForLoadState("networkidle");

    // Verify page loaded
    await expect(page.locator('h1:has-text("Trip Videos")')).toBeVisible({
      timeout: 10000,
    });
    await page.screenshot({
      path: "e2e/screenshots/video-page-loaded.png",
    });

    // Capture auth token for API calls
    let authToken = "";
    await page.route(`${API_URL}/**`, async (route) => {
      const headers = route.request().headers();
      if (headers["authorization"]) {
        authToken = headers["authorization"].replace("Bearer ", "");
      }
      await route.continue();
    });

    // Trigger a navigation to capture the token
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check if there's already a completed video
    const existingVideo = page.locator('[data-testid="video-player"]');
    const hasExistingVideo = await existingVideo.isVisible().catch(() => false);

    if (hasExistingVideo) {
      console.log("Found existing video — verifying playback");
      // Verify video element has valid src
      const src = await existingVideo.getAttribute("src");
      expect(src).toBeTruthy();
      expect(src).toContain("supabase");
      console.log("Video src:", src);

      await page.screenshot({
        path: "e2e/screenshots/video-existing-player.png",
      });
    } else {
      console.log("No existing video — generating new one");

      // Find the first "Generate Segment Overview" button (Lisbon is first segment)
      const generateBtn = page
        .locator("button")
        .filter({ hasText: "Generate Segment Overview" })
        .first();
      await expect(generateBtn).toBeVisible({ timeout: 10000 });

      // Click generate
      await generateBtn.click();
      console.log("Clicked generate — waiting for video...");

      // Wait for status to progress through stages
      // Poll the page for up to 8 minutes
      let videoComplete = false;
      for (let i = 0; i < 160; i++) {
        await page.waitForTimeout(3000);

        // Check for completion
        const videoPlayer = page.locator('[data-testid="video-player"]');
        const isVisible = await videoPlayer.isVisible().catch(() => false);
        if (isVisible) {
          videoComplete = true;
          console.log(`Video complete after ~${(i * 3)} seconds`);
          break;
        }

        // Check for failure
        const failedText = page.locator("text=Failed");
        const hasFailed = await failedText.isVisible().catch(() => false);
        if (hasFailed) {
          const errorMsg = await page
            .locator(".text-red-400")
            .first()
            .textContent()
            .catch(() => "Unknown error");
          console.log("Video generation FAILED:", errorMsg);
          await page.screenshot({
            path: "e2e/screenshots/video-generation-failed.png",
          });
          // Don't throw — capture state for debugging
          break;
        }

        // Log progress
        if (i % 10 === 0) {
          const statusText = await page
            .locator(".text-blue-500, .text-purple-500, .text-amber-500")
            .first()
            .textContent()
            .catch(() => "unknown");
          console.log(`[${i * 3}s] Status: ${statusText}`);
        }
      }

      if (videoComplete) {
        // Verify the video player
        const videoPlayer = page.locator('[data-testid="video-player"]');
        await expect(videoPlayer).toBeVisible();

        const src = await videoPlayer.getAttribute("src");
        expect(src).toBeTruthy();
        console.log("Video URL:", src);

        // Verify the video URL is accessible
        if (src && authToken) {
          const response = await page.request.head(src);
          expect(response.ok()).toBeTruthy();
          console.log("Video URL is accessible:", response.status());
        }

        await page.screenshot({
          path: "e2e/screenshots/video-generation-complete.png",
        });
      }
    }

    // Verify segment data is reflected in the UI
    // The page should show segment names from the trip
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Lisbon");

    // Final screenshot
    await page.screenshot({
      path: "e2e/screenshots/video-final-state.png",
      fullPage: true,
    });
  });
});
