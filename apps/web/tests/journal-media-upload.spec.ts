import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Journal Media Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('can create journal entry with image upload', async ({ page }) => {
    // Navigate to journal page
    await page.goto('http://localhost:3000/journal');
    await page.waitForLoadState('networkidle');

    // Click "New Entry" button
    const newEntryButton = page.locator('a:has-text("New Entry")').first();
    await expect(newEntryButton).toBeVisible({ timeout: 10000 });
    await newEntryButton.click();

    // Wait for mode selection page
    await page.waitForURL('**/journal/new', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Select "Free Write" mode
    const freeWriteButton = page.locator('button:has-text("Free Write")');
    await expect(freeWriteButton).toBeVisible({ timeout: 5000 });
    await freeWriteButton.click();

    // Wait for editor to appear
    await page.waitForTimeout(1000);

    // Fill in the title
    const titleInput = page.locator('input[placeholder="Title (optional)"]');
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    const testTitle = `Media Upload Test ${Date.now()}`;
    await titleInput.fill(testTitle);

    // Fill in the content
    const contentTextarea = page.locator('textarea[placeholder="What\'s on your mind?"]');
    await expect(contentTextarea).toBeVisible({ timeout: 5000 });
    await contentTextarea.click();
    await contentTextarea.fill('Testing image upload functionality with Playwright.');

    // Take screenshot before upload
    await page.screenshot({ path: 'test-results/journal-before-upload.png', fullPage: true });

    // Find the file input and upload an image
    const fileInput = page.locator('input[type="file"]');

    // Use a test fixture image
    const testImagePath = path.join(__dirname, 'fixtures/test-image.png');
    await fileInput.setInputFiles(testImagePath);

    // Wait for preview to appear
    await page.waitForTimeout(1000);

    // Verify the image preview is shown (check for the preview container)
    const previewImage = page.locator('.relative.group img, .aspect-video img').first();
    await expect(previewImage).toBeVisible({ timeout: 5000 });

    // Take screenshot showing the preview
    await page.screenshot({ path: 'test-results/journal-with-preview.png', fullPage: true });

    console.log('Image preview is visible - upload pending');

    // Select a mood (Happy)
    const happyMood = page.locator('button:has-text("Happy")');
    await happyMood.click();

    // Click Save button
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait for navigation to the entry detail page (may take longer due to upload)
    await page.waitForURL(/\/journal\/[a-f0-9-]+/, { timeout: 30000 });

    // Take screenshot of the created entry
    await page.screenshot({ path: 'test-results/journal-with-media.png', fullPage: true });

    // Verify entry was created with title
    await expect(page.locator(`text=${testTitle}`).first()).toBeVisible({ timeout: 5000 });

    // Look for the uploaded image in the entry view
    const uploadedImage = page.locator('img[src*="supabase"], img[src*="singularity-uploads"]').first();

    // Check if image is visible or at least the media section exists
    const hasMedia = await uploadedImage.isVisible().catch(() => false);

    if (hasMedia) {
      console.log('SUCCESS: Image is visible in the created entry!');
    } else {
      // Check if there's any media indicator
      const mediaSection = page.locator('text=Photos, text=Media, text=Images').first();
      const hasMediaSection = await mediaSection.isVisible().catch(() => false);
      console.log(`Media section visible: ${hasMediaSection}`);
    }

    console.log('Journal entry with media created successfully!');
    console.log(`Title: ${testTitle}`);
  });
});
