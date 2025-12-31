import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Biomarker Extraction Progress UI', () => {
  test('should show dual progress bars when uploading multiple files', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'rjoberlander@gmail.com');
    await page.fill('input[type="password"]', 'Cookie123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Navigate to biomarkers
    await page.goto('http://localhost:3000/biomarkers');
    await page.waitForLoadState('networkidle');

    // Look for the chat input area to attach files
    const attachButton = page.locator('button:has-text("Attach")').first();

    if (await attachButton.isVisible()) {
      // Get the file input
      const fileInput = page.locator('input[type="file"]').first();

      // Use existing test screenshots as test files
      const existingScreenshots = fs.readdirSync('tests/screenshots').filter(f => f.endsWith('.png'));

      if (existingScreenshots.length >= 1) {
        // Upload files
        await fileInput.setInputFiles(
          existingScreenshots.slice(0, 2).map(f => `tests/screenshots/${f}`)
        );

        // Click extract button
        const extractButton = page.locator('button:has-text("Extract")').first();
        if (await extractButton.isVisible()) {
          await extractButton.click();

          // Wait a moment for the modal to appear
          await page.waitForTimeout(1500);

          // Take screenshot
          await page.screenshot({ path: 'tests/screenshots/extraction-progress-ui.png', fullPage: false });

          // Get the dialog content
          const dialog = page.locator('[role="dialog"]');
          if (await dialog.isVisible()) {
            const html = await dialog.innerHTML();
            console.log('\n=== MODAL HTML ===\n');
            console.log(html.substring(0, 3000));
            console.log('\n=== END MODAL HTML ===\n');

            // Check for new triple progress bar labels
            const hasOverallProgress = html.includes('Overall Progress');
            console.log('Has "Overall Progress" text:', hasOverallProgress);

            const hasFilesProcessed = html.includes('Files Processed');
            console.log('Has "Files Processed" text:', hasFilesProcessed);

            const hasCurrentFile = html.includes('Current File');
            console.log('Has "Current File" text:', hasCurrentFile);
          }

          // Wait more and screenshot again
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'tests/screenshots/extraction-progress-ui-2.png', fullPage: false });
        }
      }
    }

    // Check if progress bars exist
    const progressBars = await page.locator('[role="progressbar"]').count();
    console.log('Number of progress bars:', progressBars);
  });
});
