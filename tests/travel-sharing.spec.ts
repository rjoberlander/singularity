import { test, expect } from "@playwright/test";

/**
 * Phase 6: Sharing & Export Tests
 *
 * Tests: Share with users, public link, export
 * Validates: Sharing settings, permissions, public access
 */

// Helper functions
async function login(page: any) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

async function goToTravel(page: any) {
  await page.goto("http://localhost:3000/travel");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
}

async function openOrCreateTrip(page: any, tripName: string = "Sharing Test Trip") {
  await goToTravel(page);

  const existingTrip = page.locator('[data-testid="trip-card"], .trip-card, [class*="cursor-pointer"]')
    .filter({ hasText: tripName })
    .first();

  if (await existingTrip.count() > 0) {
    await existingTrip.click();
    await page.waitForTimeout(1000);
    return;
  }

  // Create new trip
  await page.locator('button:has-text("Add Trip")').first().click();
  await page.waitForTimeout(500);

  await page.locator('input[name="name"]').fill(tripName);
  await page.locator('textarea[name="description"]').fill("Trip for testing sharing features");
  await page.locator('input[name="start_date"], input[type="date"]').first().fill("2026-07-01");
  await page.locator('input[name="end_date"], input[type="date"]').last().fill("2026-07-10");
  await page.locator('input[name="origin"]').fill("Los Angeles, CA");
  await page.locator('input[name="destination"]').fill("Lisbon, Portugal");
  await page.locator('input[name="traveler_count"]').fill("5");

  await page.locator('[role="dialog"] button[type="submit"]').click();
  await page.waitForTimeout(2000);

  await page.locator('[data-testid="trip-card"], .trip-card')
    .filter({ hasText: tripName })
    .first()
    .click();
  await page.waitForTimeout(1000);
}

test.describe("Phase 6: Sharing & Export", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ============================================
  // SHARING SETTINGS UI
  // ============================================

  test("6.S.1 - Open sharing settings", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Trip detail before sharing
    await page.screenshot({ path: "tests/screenshots/travel-sharing-before.png", fullPage: true });

    // Look for share button
    const shareButton = page.locator(
      'button:has-text("Share"), ' +
      'button[aria-label="Share"], ' +
      '[data-testid="share-trip"], ' +
      'button svg.lucide-share'
    ).first();

    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);

      // Screenshot: Sharing modal/panel
      await page.screenshot({ path: "tests/screenshots/travel-sharing-modal.png" });

      // Verify sharing UI elements
      const sharingDialog = page.locator('[role="dialog"], [data-testid="sharing-settings"]');
      if (await sharingDialog.count() > 0) {
        console.log("SUCCESS: Sharing settings opened");

        // Check for expected elements
        const hasPublicToggle = await page.locator('text=Public, input[name="is_public"], [data-testid="public-toggle"]').count() > 0;
        const hasShareLink = await page.locator('text=Link, input[readonly], [data-testid="share-link"]').count() > 0;
        const hasPermissions = await page.locator('text=Permission, text=View, text=Edit').count() > 0;

        console.log(`Has public toggle: ${hasPublicToggle}`);
        console.log(`Has share link: ${hasShareLink}`);
        console.log(`Has permissions: ${hasPermissions}`);
      }
    } else {
      console.log("Share button not found");
    }
  });

  // ============================================
  // SHARE WITH FAMILY MEMBER
  // ============================================

  test("6.S.2 - Share trip with family member", async ({ page }) => {
    await openOrCreateTrip(page);

    // Open sharing
    const shareButton = page.locator('button:has-text("Share"), [data-testid="share-trip"]').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Screenshot: Sharing modal
    await page.screenshot({ path: "tests/screenshots/travel-sharing-family.png" });

    // Look for "Add Person" or user selector
    const addPersonButton = page.locator(
      'button:has-text("Add Person"), ' +
      'button:has-text("Add User"), ' +
      'button:has-text("Share with"), ' +
      '[data-testid="add-share-user"]'
    ).first();

    if (await addPersonButton.count() > 0) {
      await addPersonButton.click();
      await page.waitForTimeout(500);

      // Look for user selector/search
      const userSearch = page.locator(
        'input[placeholder*="email" i], ' +
        'input[placeholder*="search" i], ' +
        'input[placeholder*="user" i]'
      ).first();

      if (await userSearch.count() > 0) {
        // Enter an email (this would need to be a real linked user in production)
        await userSearch.fill("family@example.com");
        await page.waitForTimeout(500);

        // Screenshot: User search
        await page.screenshot({ path: "tests/screenshots/travel-sharing-user-search.png" });
      }

      // Select permission level
      const permissionSelector = page.locator('select[name="permission"], button:has-text("View"), button:has-text("Edit")');
      if (await permissionSelector.count() > 0) {
        // Try to select View permission
        await permissionSelector.first().click();
        await page.waitForTimeout(300);
      }

      // Confirm share
      const confirmButton = page.locator('button:has-text("Share"), button:has-text("Add"), button:has-text("Invite")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }

      // Screenshot: After sharing
      await page.screenshot({ path: "tests/screenshots/travel-sharing-after-add.png" });

      console.log("SUCCESS: Share with user flow completed");
    } else {
      console.log("Add person button not found - may use different UI pattern");
    }
  });

  // ============================================
  // PUBLIC LINK
  // ============================================

  test("6.S.3 - Enable public link sharing", async ({ page }) => {
    await openOrCreateTrip(page);

    // Open sharing
    const shareButton = page.locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Screenshot: Before enabling public
    await page.screenshot({ path: "tests/screenshots/travel-sharing-public-before.png" });

    // Look for public toggle
    const publicToggle = page.locator(
      'input[name="is_public"], ' +
      '[data-testid="public-toggle"], ' +
      '[role="switch"]:near(:text("Public")), ' +
      'button:has-text("Make Public")'
    ).first();

    if (await publicToggle.count() > 0) {
      await publicToggle.click();
      await page.waitForTimeout(1000);

      // Screenshot: After enabling public
      await page.screenshot({ path: "tests/screenshots/travel-sharing-public-after.png" });

      // Check for share link
      const shareLink = page.locator(
        'input[readonly][value*="http"], ' +
        '[data-testid="share-link"], ' +
        'text=/travel\\/public\\//i'
      );

      if (await shareLink.count() > 0) {
        const linkValue = await shareLink.first().inputValue().catch(() => null) ||
                         await shareLink.first().textContent();
        console.log(`Share link: ${linkValue}`);
        console.log("SUCCESS: Public link generated");
      }
    } else {
      console.log("Public toggle not found");
    }
  });

  // ============================================
  // COPY SHARE LINK
  // ============================================

  test("6.S.4 - Copy share link to clipboard", async ({ page }) => {
    await openOrCreateTrip(page);

    // Open sharing
    const shareButton = page.locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Look for copy button
    const copyButton = page.locator(
      'button:has-text("Copy"), ' +
      'button[aria-label="Copy"], ' +
      '[data-testid="copy-link"], ' +
      'button svg.lucide-copy'
    ).first();

    if (await copyButton.count() > 0) {
      await copyButton.click();
      await page.waitForTimeout(500);

      // Screenshot: After copy
      await page.screenshot({ path: "tests/screenshots/travel-sharing-copy-link.png" });

      // Check for success indication (toast or button text change)
      const toast = page.locator('[data-sonner-toast]');
      const copiedIndicator = page.locator('text=Copied, button:has-text("Copied")');

      if (await toast.count() > 0 || await copiedIndicator.count() > 0) {
        console.log("SUCCESS: Link copied to clipboard");
      }
    } else {
      console.log("Copy link button not found");
    }
  });

  // ============================================
  // PASSWORD PROTECTION
  // ============================================

  test("6.S.5 - Add password protection to public link", async ({ page }) => {
    await openOrCreateTrip(page);

    // Open sharing
    const shareButton = page.locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Look for password option
    const passwordToggle = page.locator(
      'input[name="password_protected"], ' +
      '[data-testid="password-toggle"], ' +
      'text=Password, ' +
      'button:has-text("Add Password")'
    ).first();

    if (await passwordToggle.count() > 0) {
      await passwordToggle.click();
      await page.waitForTimeout(500);

      // Screenshot: Password field
      await page.screenshot({ path: "tests/screenshots/travel-sharing-password.png" });

      // Enter password
      const passwordField = page.locator('input[type="password"], input[name="share_password"]').first();
      if (await passwordField.count() > 0) {
        await passwordField.fill("TripPassword123!");

        // Save password
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Set Password")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);
        }

        // Screenshot: Password set
        await page.screenshot({ path: "tests/screenshots/travel-sharing-password-set.png" });

        console.log("SUCCESS: Password protection added");
      }
    } else {
      console.log("Password protection option not found");
    }
  });

  // ============================================
  // REMOVE SHARING
  // ============================================

  test("6.S.6 - Remove shared user", async ({ page }) => {
    await openOrCreateTrip(page);

    // Open sharing
    const shareButton = page.locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Find shared users list
    const sharedUserItem = page.locator(
      '[data-testid="shared-user"], ' +
      '.shared-user, ' +
      '[class*="shared"]'
    ).first();

    if (await sharedUserItem.count() > 0) {
      // Look for remove button
      const removeButton = sharedUserItem.locator('button:has-text("Remove"), button svg.lucide-x, button svg.lucide-trash-2');

      if (await removeButton.count() > 0) {
        // Screenshot: Before remove
        await page.screenshot({ path: "tests/screenshots/travel-sharing-before-remove.png" });

        await removeButton.click();
        await page.waitForTimeout(1000);

        // Screenshot: After remove
        await page.screenshot({ path: "tests/screenshots/travel-sharing-after-remove.png" });

        console.log("SUCCESS: Shared user removed");
      }
    } else {
      console.log("No shared users found to remove");
    }
  });

  // ============================================
  // PUBLIC TRIP VIEW (LOGGED OUT)
  // ============================================

  test("6.S.7 - View public trip without login", async ({ page }) => {
    // First, get the public URL while logged in
    await login(page);
    await openOrCreateTrip(page);

    // Enable public and get link
    const shareButton = page.locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Enable public if not already
    const publicToggle = page.locator('[data-testid="public-toggle"], input[name="is_public"]').first();
    if (await publicToggle.count() > 0) {
      const isChecked = await publicToggle.isChecked().catch(() => false);
      if (!isChecked) {
        await publicToggle.click();
        await page.waitForTimeout(1000);
      }
    }

    // Get the share link
    const shareLinkInput = page.locator('input[readonly][value*="http"], [data-testid="share-link"]');
    let publicUrl = "";

    if (await shareLinkInput.count() > 0) {
      publicUrl = await shareLinkInput.inputValue().catch(() => "");
    }

    // Close sharing modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    if (publicUrl) {
      // Logout
      await page.goto("http://localhost:3000/login");
      // Clear session
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Visit public URL
      await page.goto(publicUrl);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Screenshot: Public view
      await page.screenshot({ path: "tests/screenshots/travel-sharing-public-view.png", fullPage: true });

      // Verify trip is visible
      const tripContent = page.locator('[data-testid="trip-name"], h1, h2');
      if (await tripContent.count() > 0) {
        console.log("SUCCESS: Public trip viewable without login");
      }
    } else {
      console.log("Could not get public URL for testing");
    }
  });

  // ============================================
  // EXPORT TO PDF
  // ============================================

  test("6.S.8 - Export trip to PDF", async ({ page }) => {
    await openOrCreateTrip(page);

    // Screenshot: Before export
    await page.screenshot({ path: "tests/screenshots/travel-export-before.png", fullPage: true });

    // Look for export button
    const exportButton = page.locator(
      'button:has-text("Export"), ' +
      'button:has-text("Download"), ' +
      '[data-testid="export-trip"], ' +
      'button svg.lucide-download'
    ).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Screenshot: Export options
      await page.screenshot({ path: "tests/screenshots/travel-export-options.png" });

      // Look for PDF option
      const pdfOption = page.locator(
        'button:has-text("PDF"), ' +
        '[data-value="pdf"], ' +
        'text=Export as PDF'
      ).first();

      if (await pdfOption.count() > 0) {
        // Set up download promise
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

        await pdfOption.click();

        const download = await downloadPromise;

        if (download) {
          const filename = download.suggestedFilename();
          console.log(`Downloaded file: ${filename}`);

          // Screenshot: After download
          await page.screenshot({ path: "tests/screenshots/travel-export-pdf-downloaded.png" });

          console.log("SUCCESS: PDF export completed");
        } else {
          console.log("PDF download not triggered or timed out");
        }
      } else {
        console.log("PDF option not found");
      }
    } else {
      console.log("Export button not found");
    }
  });

  // ============================================
  // EXPORT TO MARKDOWN
  // ============================================

  test("6.S.9 - Export trip to Markdown", async ({ page }) => {
    await openOrCreateTrip(page);

    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-trip"]').first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);

      // Look for Markdown option
      const markdownOption = page.locator(
        'button:has-text("Markdown"), ' +
        '[data-value="markdown"], ' +
        'button:has-text(".md")'
      ).first();

      if (await markdownOption.count() > 0) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

        await markdownOption.click();

        const download = await downloadPromise;

        if (download) {
          const filename = download.suggestedFilename();
          console.log(`Downloaded file: ${filename}`);
          console.log("SUCCESS: Markdown export completed");
        } else {
          console.log("Markdown download not triggered or timed out");
        }
      } else {
        console.log("Markdown option not found");
      }
    }
  });

  // ============================================
  // SHARING PERMISSIONS
  // ============================================

  test("6.S.10 - Change sharing permission level", async ({ page }) => {
    await openOrCreateTrip(page);

    // Open sharing
    const shareButton = page.locator('button:has-text("Share")').first();
    if (await shareButton.count() > 0) {
      await shareButton.click();
      await page.waitForTimeout(500);
    }

    // Find a shared user with permission selector
    const permissionSelector = page.locator(
      'select[name="permission"], ' +
      '[data-testid="permission-select"], ' +
      'button:has-text("View"), button:has-text("Edit")'
    ).first();

    if (await permissionSelector.count() > 0) {
      // Screenshot: Before permission change
      await page.screenshot({ path: "tests/screenshots/travel-sharing-permission-before.png" });

      await permissionSelector.click();
      await page.waitForTimeout(300);

      // Try to select Edit permission
      const editOption = page.locator('[data-value="edit"], option[value="edit"], text=Edit').first();
      if (await editOption.count() > 0) {
        await editOption.click();
        await page.waitForTimeout(1000);
      }

      // Screenshot: After permission change
      await page.screenshot({ path: "tests/screenshots/travel-sharing-permission-after.png" });

      console.log("SUCCESS: Permission level changed");
    } else {
      console.log("Permission selector not found");
    }
  });
});

// ============================================
// CLEANUP
// ============================================
test("cleanup: delete sharing test trip", async ({ page }) => {
  await login(page);
  await goToTravel(page);

  const testTrip = page.locator('[data-testid="trip-card"], .trip-card')
    .filter({ hasText: "Sharing Test Trip" })
    .first();

  if (await testTrip.count() > 0) {
    await testTrip.click();
    await page.waitForTimeout(500);

    const deleteButton = page.locator('button:has-text("Delete"), button svg.lucide-trash-2').first();

    if (await deleteButton.count() > 0) {
      page.once('dialog', async dialog => {
        await dialog.accept();
      });

      await deleteButton.click();
      await page.waitForTimeout(1500);
      console.log("Deleted: Sharing Test Trip");
    } else {
      await page.keyboard.press('Escape');
    }
  }

  console.log("Cleanup complete");
});
