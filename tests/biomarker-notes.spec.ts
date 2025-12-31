import { test, expect } from "@playwright/test";

test.describe("Biomarker Notes", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  test("should add a note to a biomarker", async ({ page }) => {
    // Collect console logs and network requests for debugging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // Monitor network requests
    page.on('response', response => {
      if (response.url().includes('/biomarkers/notes')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to biomarkers page
    await page.goto("http://localhost:3000/biomarkers");
    await page.waitForSelector("h1:has-text('Biomarkers')");
    await page.waitForTimeout(2000);

    // Click on ALT biomarker
    const altCard = page.locator('h3:has-text("ALT")').first();
    if (await altCard.isVisible()) {
      await altCard.click({ force: true });
      await page.waitForTimeout(1000);

      // Wait for dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Take screenshot of modal
      await page.screenshot({ path: "tests/screenshots/notes-modal-initial.png" });

      // Check for Notes section
      const notesSection = page.locator('text=Notes').first();
      await expect(notesSection).toBeVisible();
      console.log("Notes section found");

      // Wait for notes to finish loading - either Add Note button or existing notes appear
      const addNoteButton = page.locator('button:has-text("Add Note")');
      const noNotesText = page.locator('text="No notes yet"');
      const existingNote = page.locator('text="Test note from Playwright"');

      // Wait for any of these to appear (notes loaded)
      await expect(addNoteButton.or(noNotesText).or(existingNote).first()).toBeVisible({ timeout: 10000 });

      // Take screenshot after notes loaded
      await page.screenshot({ path: "tests/screenshots/notes-loaded.png" });

      // Click Add Note button (already defined above)
      if (await addNoteButton.isVisible()) {
        console.log("Clicking Add Note button");
        await addNoteButton.click();
        await page.waitForTimeout(500);

        // Take screenshot after clicking add
        await page.screenshot({ path: "tests/screenshots/notes-add-form.png" });

        // Fill in the note with unique timestamp
        const uniqueNoteText = `Test note ${Date.now()}`;
        const textarea = dialog.locator('textarea[placeholder*="Add a note"]');
        await expect(textarea).toBeVisible({ timeout: 3000 });
        await textarea.fill(uniqueNoteText);

        // Take screenshot with filled text
        await page.screenshot({ path: "tests/screenshots/notes-filled.png" });

        // Click Save button
        const saveButton = dialog.locator('button:has-text("Save")').first();
        await expect(saveButton).toBeVisible();
        console.log("Clicking Save button");
        await saveButton.click();

        // Wait for save to complete
        await page.waitForTimeout(3000);

        // Take screenshot after save
        await page.screenshot({ path: "tests/screenshots/notes-after-save.png" });

        // Check if note was saved (should see the note text or error)
        const noteText = page.locator(`text="${uniqueNoteText}"`);
        const noteVisible = await noteText.isVisible({ timeout: 5000 }).catch(() => false);

        if (noteVisible) {
          console.log("Note was saved successfully!");
        } else {
          console.log("Note was NOT saved - checking for errors");

          // Check if we're still in add mode (save failed)
          const stillInAddMode = await textarea.isVisible().catch(() => false);
          if (stillInAddMode) {
            console.log("Still in add mode - save likely failed");
          }

          // Check for error messages
          const errorText = await page.locator('.text-red-500, .text-destructive, [role="alert"]').count();
          console.log(`Found ${errorText} potential error elements`);
        }

        // Final assertion
        await expect(noteText).toBeVisible({ timeout: 5000 });
      } else {
        // Maybe there's already notes - check for existing notes
        console.log("Add Note button not visible, checking for existing notes or different UI");
        await page.screenshot({ path: "tests/screenshots/notes-no-add-button.png" });
      }
    } else {
      console.log("ALT card not found");
      throw new Error("ALT biomarker card not found");
    }
  });
});
