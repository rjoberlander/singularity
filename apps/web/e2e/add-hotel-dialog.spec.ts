import { test, expect } from "@playwright/test";

const TRIP_ID = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
const SUPABASE_URL = "https://cymbadkegbibhxbfevuq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzE0MTgsImV4cCI6MjA4OTM0NzQxOH0.2CHC5jlQy7TsS50fV8QAZnxSZoxx6S7QgcnwXyLoua4";
const NEW_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

test.describe("Add Hotel Dialog", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token via Supabase
    const loginResp = await request.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        data: {
          email: "rjoberlander@gmail.com",
          password: "Cookie123!",
        },
      }
    );
    const loginData = await loginResp.json();
    authToken = loginData.access_token;

    // Update Anthropic key via API
    const keysResp = await request.get(
      "http://localhost:3002/api/v1/ai-api-keys",
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const keysData = await keysResp.json();
    const anthropicKey = keysData.data?.find(
      (k: any) => k.provider === "anthropic"
    );

    if (anthropicKey) {
      const updateResp = await request.patch(
        `http://localhost:3002/api/v1/ai-api-keys/${anthropicKey.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          data: { api_key: NEW_ANTHROPIC_KEY },
        }
      );
      const updateData = await updateResp.json();
      console.log(
        "Anthropic key updated:",
        updateData.data?.health_status,
        updateData.data?.api_key_masked
      );
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill("#email", "rjoberlander@gmail.com");
    await page.fill("#password", "Cookie123!");
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/(dashboard|travel|$)/, { timeout: 15000 });
  });

  test("look up Hyatt Regency Lisbon via URL and save", async ({ page }) => {
    // Navigate to the Plan tab
    await page.goto(`http://localhost:3000/travel/${TRIP_ID}/plan`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("h2", { hasText: "Trip Planning Guide" })
    ).toBeVisible({ timeout: 10000 });

    // Expand Accommodations step
    const accommodationsCard = page.locator("text=Accommodations").first();
    await accommodationsCard.click();
    await page.waitForTimeout(500);

    // Find a "+ Add" button
    const addButton = page.locator("button:has-text('Add')").first();
    const addButtonVisible = await addButton.isVisible().catch(() => false);
    if (!addButtonVisible) {
      console.log(
        "All segments already have hotels, skipping hotel lookup test"
      );
      return;
    }

    await page.screenshot({
      path: "e2e/screenshots/hotel-add-button-visible.png",
    });

    // Click "+ Add"
    await addButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator("text=Add Hotel")).toBeVisible();

    // Enter the Hyatt Regency Lisbon URL
    const input = dialog.locator("input").first();
    await input.fill(
      "Hyatt Regency Lisbon — https://www.hyatt.com/hyatt-regency/en-US/lishr-hyatt-regency-lisbon"
    );

    await page.screenshot({
      path: "e2e/screenshots/hotel-lookup-input.png",
    });

    // Click "Look up"
    await dialog.locator('button:has-text("Look up")').click();

    // Should show loading state
    await expect(
      dialog.locator("text=Looking up hotel details")
    ).toBeVisible({ timeout: 5000 });

    // Wait for the review step (LLM call can take 10-20s)
    await expect(dialog.locator('label:has-text("Address")')).toBeVisible({
      timeout: 45000,
    });

    // Verify hotel name was detected
    const nameInput = dialog.locator("input").first();
    const nameValue = await nameInput.inputValue();
    expect(nameValue.toLowerCase()).toContain("hyatt");
    console.log("Hotel name:", nameValue);

    // Check address
    const addressInput = dialog.locator("input").nth(1);
    const addressValue = await addressInput.inputValue();
    console.log("Hotel address:", addressValue);

    await page.screenshot({
      path: "e2e/screenshots/hotel-lookup-review.png",
    });

    // Confirm to save
    await dialog.locator('button:has-text("Confirm")').click();

    // Wait for toast
    await expect(
      page.locator("[data-sonner-toast]").first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "e2e/screenshots/hotel-added-success.png",
    });
  });
});
