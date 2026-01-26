import { test } from "@playwright/test";

test("Delete orphaned research items with null segment_id", async ({ page }) => {
  // Login first
  await page.goto("http://localhost:3000/login");
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Capture the auth token from API calls
  let token: string | null = null;
  page.on("request", (request) => {
    const auth = request.headers()["authorization"];
    if (auth && auth.startsWith("Bearer ") && !token) {
      token = auth.replace("Bearer ", "");
    }
  });

  // Navigate to the trip page to trigger API calls
  await page.goto("http://localhost:3000/travel/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/plan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  console.log("Token found:", !!token);

  // Get all research items
  const itemsData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/research-items", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  // Find items with null segment_id
  const orphanedItems = itemsData.data?.filter((item: any) => !item.segment_id) || [];
  console.log(`Found ${orphanedItems.length} orphaned items to delete`);

  // Delete each orphaned item
  let deleted = 0;
  let failed = 0;
  for (const item of orphanedItems) {
    const result = await page.evaluate(async ({ itemId, authToken }) => {
      const resp = await fetch(`http://localhost:3002/api/v1/travel/research-items/${itemId}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      return { ok: resp.ok, status: resp.status };
    }, { itemId: item.id, authToken: token });

    if (result.ok) {
      deleted++;
    } else {
      failed++;
      console.log(`Failed to delete ${item.id}: status ${result.status}`);
    }
  }

  console.log(`\nDeleted ${deleted} items, ${failed} failed`);

  // Verify remaining items
  const afterData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/research-items", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  const remainingTotal = afterData.data?.length || 0;
  const remainingWithSegment = afterData.data?.filter((i: any) => i.segment_id).length || 0;
  const remainingOrphaned = afterData.data?.filter((i: any) => !i.segment_id).length || 0;

  console.log(`\nRemaining: ${remainingTotal} total, ${remainingWithSegment} with segment, ${remainingOrphaned} orphaned`);
});
