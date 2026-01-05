import { test, expect } from '@playwright/test';

test.describe('Journal Entry Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('can create a new journal entry via freeform mode', async ({ page }) => {
    // Navigate to journal page
    await page.goto('http://localhost:3000/journal');
    await page.waitForLoadState('networkidle');

    // Take screenshot of journal page
    await page.screenshot({ path: 'test-results/journal-page.png', fullPage: true });

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
    const testTitle = `Test Entry ${Date.now()}`;
    await titleInput.fill(testTitle);

    // Fill in the content
    const contentTextarea = page.locator('textarea[placeholder="What\'s on your mind?"]');
    await expect(contentTextarea).toBeVisible({ timeout: 5000 });
    const testContent = 'This is a test journal entry created by Playwright automated testing.';
    await contentTextarea.click();
    await contentTextarea.fill(testContent);

    // Select a mood (Happy)
    const happyMood = page.locator('button:has-text("Happy")');
    await happyMood.click();

    // Take screenshot before saving
    await page.screenshot({ path: 'test-results/journal-filled.png', fullPage: true });

    // Click Save button
    const saveButton = page.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait for navigation to the entry detail page
    await page.waitForURL(/\/journal\/[a-f0-9-]+/, { timeout: 15000 });

    // Take screenshot of the created entry
    await page.screenshot({ path: 'test-results/journal-created.png', fullPage: true });

    // Verify entry content is displayed
    await expect(page.locator(`text=${testTitle}`).first()).toBeVisible({ timeout: 5000 });

    console.log('Journal entry created successfully!');
    console.log(`Title: ${testTitle}`);

    // Navigate back to journal list and verify entry appears
    await page.goto('http://localhost:3000/journal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot of journal list with new entry
    await page.screenshot({ path: 'test-results/journal-list-with-entry.png', fullPage: true });

    // Verify the entry appears in the list
    await expect(page.locator(`text=${testTitle}`).first()).toBeVisible({ timeout: 10000 });
    console.log('Entry appears in journal list - test passed!');
  });
});
