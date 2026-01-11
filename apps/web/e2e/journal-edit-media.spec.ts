import { test, expect, Page } from "@playwright/test";

// Helper to log console messages
const setupConsoleLogging = (page: Page) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
};

test.describe("Journal Edit - Media and Content", () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleLogging(page);

    // Login first
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  test("can edit existing journal entry - delete photo, edit text, add tag", async ({ page }) => {
    // Step 1: Go to journal list to find an existing entry
    console.log("Step 1: Going to journal list...");
    await page.goto("http://localhost:3000/journal");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot of journal list
    await page.screenshot({ path: 'test-results/journal-list.png' });

    // Check if there are any entries with images
    const entriesWithMedia = page.locator('img[src*="singularity-uploads"]');
    const mediaCount = await entriesWithMedia.count();
    console.log("Entries with media visible:", mediaCount);

    // Find the first journal entry link
    const entryLinks = page.locator('a[href^="/journal/"]').filter({ hasNot: page.locator('text=New Entry') });
    const entryCount = await entryLinks.count();
    console.log("Journal entries found:", entryCount);

    if (entryCount === 0) {
      console.log("No existing entries found. Creating one first...");
      // Click New Entry
      await page.click('text=New Entry');
      await page.waitForTimeout(1000);
      await page.click('text=Free Write');
      await page.waitForTimeout(500);

      // Fill basic content (no media for now to avoid upload issues)
      await page.fill('input[placeholder="Title (optional)"]', `Test Entry ${Date.now()}`);
      await page.fill('textarea[placeholder="What\'s on your mind?"]', "Test content for edit functionality.");

      // Save
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(5000);

      // Check if redirect happened
      console.log("After save URL:", page.url());
      await page.screenshot({ path: 'test-results/after-new-entry-save.png' });

      // If still on /new page, there's a save problem
      if (page.url().includes('/new')) {
        console.log("Save failed - staying on new page");
        throw new Error("Failed to create entry - API may not be working");
      }
    }

    // Go back to journal list if we created a new entry
    if (!page.url().includes('/journal') || page.url().includes('/new')) {
      await page.goto("http://localhost:3000/journal");
      await page.waitForLoadState("networkidle");
    }

    // Click on the first entry
    const firstEntry = page.locator('a[href^="/journal/"]').filter({ hasNot: page.locator('text=New Entry') }).first();
    const entryHref = await firstEntry.getAttribute('href');
    console.log("Opening entry:", entryHref);

    if (!entryHref) {
      throw new Error("No entry href found");
    }

    await firstEntry.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Get the entry ID from URL
    const entryUrl = page.url();
    const entryId = entryUrl.split("/journal/")[1]?.split("/")[0];
    console.log("Entry ID:", entryId);

    // Check if entry has media
    const viewMediaCount = await page.locator('img[src*="singularity-uploads"]').count();
    console.log("Media on view page:", viewMediaCount);

    // Take screenshot
    await page.screenshot({ path: 'test-results/entry-view.png' });

    // Step 2: Go to edit page
    console.log("\nStep 2: Going to edit page...");
    await page.goto(`http://localhost:3000/journal/${entryId}/edit`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/edit-page.png' });

    // Verify edit page loaded
    await expect(page.locator("h1").filter({ hasText: "Edit Entry" })).toBeVisible({ timeout: 10000 });
    console.log("Edit page loaded!");

    // Step 3: Check for existing media
    const existingMediaSection = page.locator("text=Current media");
    const hasExistingMedia = await existingMediaSection.isVisible().catch(() => false);
    console.log("Has existing media section:", hasExistingMedia);

    let mediaCountBefore = 0;
    if (hasExistingMedia) {
      mediaCountBefore = await page.locator('img[src*="singularity-uploads"]').count();
      console.log("Media count in edit page:", mediaCountBefore);

      if (mediaCountBefore > 0) {
        // Step 4: Delete the first photo
        console.log("\nStep 4: Deleting first photo...");
        const firstMediaContainer = page.locator('text=Current media').locator('..').locator('.grid > div').first();
        await firstMediaContainer.hover();
        await page.waitForTimeout(500);

        const deleteBtn = firstMediaContainer.locator('button');
        await deleteBtn.click();

        // Wait for toast/deletion
        await page.waitForTimeout(3000);

        // Verify count decreased
        const mediaCountAfter = await page.locator('img[src*="singularity-uploads"]').count();
        console.log("Media count after delete:", mediaCountAfter);
        expect(mediaCountAfter).toBeLessThan(mediaCountBefore);
      }
    }

    // Step 5: Edit content
    console.log("\nStep 5: Editing content...");
    const contentTextarea = page.locator('textarea[placeholder="What\'s on your mind?"]');
    await expect(contentTextarea).toBeVisible();
    const currentContent = await contentTextarea.inputValue();
    const editTimestamp = `[Edited: ${new Date().toISOString()}]`;
    await contentTextarea.fill(currentContent + "\n\n" + editTimestamp);
    console.log("Content updated with timestamp");

    // Step 6: Add a tag
    console.log("\nStep 6: Adding tag...");
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    const testTag = `test-${Date.now()}`;
    await tagInput.fill(testTag);
    await tagInput.press("Enter");
    await expect(page.locator(`text=${testTag}`)).toBeVisible({ timeout: 5000 });
    console.log("Added tag:", testTag);

    // Take screenshot before save
    await page.screenshot({ path: 'test-results/edit-before-save.png' });

    // Step 7: Save the entry
    console.log("\nStep 7: Saving entry...");
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for redirect
    await page.waitForURL(`**/journal/${entryId}`, { timeout: 30000 });
    console.log("Saved and redirected!");

    // Step 8: Verify changes on view page
    console.log("\nStep 8: Verifying on view page...");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/view-after-save.png' });

    // Verify content saved
    const pageContent = await page.content();
    expect(pageContent).toContain(editTimestamp);
    console.log("Edit timestamp saved: YES");

    // Verify tag saved
    await expect(page.locator(`text=${testTag}`)).toBeVisible();
    console.log("Tag saved: YES");

    // Verify media deleted (if applicable)
    if (hasExistingMedia && mediaCountBefore > 0) {
      const finalMediaCount = await page.locator('img[src*="singularity-uploads"]').count();
      console.log("Final media count:", finalMediaCount);
      expect(finalMediaCount).toBeLessThan(mediaCountBefore);
      console.log("Media deleted: YES");
    }

    // Step 9: Reload edit page to verify persistence
    console.log("\nStep 9: Verifying persistence on reload...");
    await page.goto(`http://localhost:3000/journal/${entryId}/edit`);
    await page.waitForLoadState("networkidle");

    // Verify content persisted
    const reloadedContent = await contentTextarea.inputValue();
    expect(reloadedContent).toContain(editTimestamp);
    console.log("Content persisted: YES");

    // Verify tag persisted
    await expect(page.locator(`text=${testTag}`)).toBeVisible();
    console.log("Tag persisted: YES");

    console.log("\n✅ All tests passed!");
  });
});
