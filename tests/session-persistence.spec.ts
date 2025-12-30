import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "test@singularity.app",
  password: "Test123!",
};

test.describe("Session Persistence", () => {
  test("should stay logged in after page refresh", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("Logged in successfully");

    // Refresh the page
    await page.reload();

    // Should still be on dashboard, not redirected to login
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log("URL after refresh:", currentUrl);

    expect(currentUrl).toContain("/dashboard");
    expect(currentUrl).not.toContain("/login");

    // Navigate to another page and back
    await page.goto("/biomarkers");
    await page.waitForTimeout(1000);

    // Should not be redirected to login
    const biomarkersUrl = page.url();
    console.log("URL after navigating to biomarkers:", biomarkersUrl);
    expect(biomarkersUrl).not.toContain("/login");

    // Go back to dashboard
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    console.log("Final URL:", finalUrl);
    expect(finalUrl).toContain("/dashboard");

    await page.screenshot({ path: "tests/screenshots/session-persisted.png" });
    console.log("Session persistence verified!");
  });
});
