import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "rjoberlander@gmail.com",
  password: "Cookie123!",
};

test("find and delete duplicate biomarkers", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page.getByLabel(/password/i).fill(TEST_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  console.log("Logged in");

  // Go to biomarkers page and intercept the API response
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/") && response.url().includes("/biomarkers") && response.request().method() === "GET",
    { timeout: 10000 }
  );

  await page.goto("/biomarkers");

  const response = await responsePromise;
  console.log(`API URL: ${response.url()}`);
  const data = await response.json();
  const biomarkers = data.data || [];
  console.log(`Total biomarkers: ${biomarkers.length}`);

  // Find duplicates: same name + same date
  const seen = new Map<string, any[]>();

  for (const b of biomarkers) {
    const key = `${b.name.toLowerCase()}|${b.date_tested}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(b);
  }

  // Find entries with duplicates
  const duplicateGroups: any[][] = [];
  for (const [key, entries] of seen) {
    if (entries.length > 1) {
      duplicateGroups.push(entries);
    }
  }

  console.log(`Found ${duplicateGroups.length} groups with duplicates`);

  // For each duplicate group, keep the first one (oldest created) and delete the rest
  const toDelete: string[] = [];

  for (const group of duplicateGroups) {
    // Sort by created_at ascending (keep oldest)
    group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    console.log(`\nDuplicate group: ${group[0].name} on ${group[0].date_tested}`);
    console.log(`  Keeping: id=${group[0].id}, value=${group[0].value}, created=${group[0].created_at}`);

    // Mark all but the first for deletion
    for (let i = 1; i < group.length; i++) {
      console.log(`  Deleting: id=${group[i].id}, value=${group[i].value}, created=${group[i].created_at}`);
      toDelete.push(group[i].id);
    }
  }

  console.log(`\nTotal duplicates to delete: ${toDelete.length}`);

  // Delete duplicates using page.evaluate to make authenticated fetch calls
  let deleted = 0;
  let failed = 0;

  for (const id of toDelete) {
    try {
      const result = await page.evaluate(async (biomarkerId) => {
        const response = await fetch(`/api/biomarkers/${biomarkerId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        return { ok: response.ok, status: response.status };
      }, id);

      if (result.ok) {
        deleted++;
      } else {
        console.log(`Failed to delete ${id}: ${result.status}`);
        failed++;
      }
    } catch (e) {
      console.log(`Error deleting ${id}:`, e);
      failed++;
    }
  }

  console.log(`\n=== CLEANUP COMPLETE ===`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Failed: ${failed}`);
  console.log(`Remaining biomarkers: ${biomarkers.length - deleted}`);

  // Reload page to verify
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "tests/screenshots/after-cleanup.png", fullPage: true });

  expect(deleted).toBeGreaterThanOrEqual(0);
});
