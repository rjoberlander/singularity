import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1400, height: 900 } });

test.describe('RV Photo Gallery Scroll-Spy', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('scroll-spy should highlight navigation chip when scrolling to section', async ({ page }) => {
    // Go to Santa Barbara RV location with multiple activity sections
    await page.goto('http://localhost:3000/rv-locations/1df8d107-9902-468d-bf37-889ffa42dd47');
    await page.waitForLoadState('networkidle');

    // Open the photo gallery
    const coverPhoto = page.locator('.grid img').first();
    await expect(coverPhoto).toBeVisible({ timeout: 10000 });
    await coverPhoto.click();

    // Wait for gallery modal to open
    await page.waitForTimeout(500);

    // Verify gallery is open
    const photoCount = page.getByText(/\d+ photos?/);
    await expect(photoCount).toBeVisible({ timeout: 5000 });

    // Screenshot initial state
    await page.screenshot({ path: 'e2e/screenshots/scroll-spy-1-initial.png' });

    // Debug: Check if sections exist in DOM
    const sections = page.locator('[id^="gallery-section-"]');
    const sectionCount = await sections.count();
    console.log(`Found ${sectionCount} gallery sections`);

    // Debug: List all section IDs
    for (let i = 0; i < sectionCount; i++) {
      const sectionId = await sections.nth(i).getAttribute('id');
      console.log(`  Section ${i}: ${sectionId}`);
    }

    // Get all navigation chips
    const navChips = page.locator('[role="dialog"] button').filter({ hasText: /\(\d+\)$/ });
    const chipCount = await navChips.count();
    console.log(`Found ${chipCount} navigation chips`);

    // Debug: List all chip classes
    for (let i = 0; i < chipCount; i++) {
      const chipText = await navChips.nth(i).textContent();
      const chipClass = await navChips.nth(i).getAttribute('class');
      const hasRing = chipClass?.includes('ring-2') ? 'ACTIVE' : 'inactive';
      console.log(`  Chip ${i}: "${chipText}" [${hasRing}]`);
    }

    // Check initial state - first chip should be highlighted (has ring-2 class)
    const firstChip = navChips.first();
    const firstChipClass = await firstChip.getAttribute('class');
    console.log('First chip class:', firstChipClass);

    // Wait a bit more and check again
    await page.waitForTimeout(1000);
    const firstChipClassAfterWait = await firstChip.getAttribute('class');
    console.log('First chip class after 1s wait:', firstChipClassAfterWait);

    await page.screenshot({ path: 'e2e/screenshots/scroll-spy-1b-after-wait.png' });

    expect(firstChipClassAfterWait).toContain('ring-2');

    // Find a chip that is NOT the first one (e.g., "Santa Barbara Zoo")
    const zooChip = page.locator('[role="dialog"] button').filter({ hasText: 'Santa Barbara Zoo' });
    const zooChipExists = await zooChip.count();
    console.log('Zoo chip exists:', zooChipExists > 0);

    if (zooChipExists > 0) {
      // Get the scroll container
      const scrollContainer = page.locator('[role="dialog"] .overflow-y-auto');

      // Scroll to the Zoo section by finding its heading
      const zooSection = page.locator('[id^="gallery-section-"]').filter({ hasText: 'Santa Barbara Zoo' });
      const zooSectionExists = await zooSection.count();
      console.log('Zoo section exists:', zooSectionExists > 0);

      if (zooSectionExists > 0) {
        // Scroll the section into view
        await zooSection.scrollIntoViewIfNeeded();

        // Wait for intersection observer to fire
        await page.waitForTimeout(500);

        // Screenshot after scrolling
        await page.screenshot({ path: 'e2e/screenshots/scroll-spy-2-scrolled-to-zoo.png' });

        // Check if Zoo chip is now highlighted
        const zooChipClassAfter = await zooChip.getAttribute('class');
        console.log('Zoo chip class after scroll:', zooChipClassAfter);

        // Check if first chip is no longer highlighted
        const firstChipClassAfter = await firstChip.getAttribute('class');
        console.log('First chip class after scroll:', firstChipClassAfter);

        // The Zoo chip should now have the ring-2 class
        expect(zooChipClassAfter).toContain('ring-2');
        // The first chip should no longer have ring-2
        expect(firstChipClassAfter).not.toContain('ring-2');
      }
    }

    // Also test clicking a chip to scroll and highlight
    const missionChip = page.locator('[role="dialog"] button').filter({ hasText: 'Mission Santa Barbara' });
    const missionExists = await missionChip.count();

    if (missionExists > 0) {
      await missionChip.click();
      await page.waitForTimeout(500);

      // Screenshot after clicking Mission chip
      await page.screenshot({ path: 'e2e/screenshots/scroll-spy-3-clicked-mission.png' });

      // Mission chip should now be highlighted
      const missionChipClass = await missionChip.getAttribute('class');
      console.log('Mission chip class after click:', missionChipClass);
      expect(missionChipClass).toContain('ring-2');
    }

    console.log('Scroll-spy test completed!');
  });
});
