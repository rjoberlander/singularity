import { test, expect } from "@playwright/test";

const PROD_URL = "http://singularity.boo";

test.describe("Production Health Check", () => {
  test("homepage loads without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto(PROD_URL, { timeout: 30000 });
    console.log(`Homepage status: ${response?.status()}`);
    console.log(`Homepage URL: ${page.url()}`);

    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: "e2e/screenshots/prod-homepage.png", fullPage: true });

    if (consoleErrors.length > 0) {
      console.log("Console errors on homepage:");
      consoleErrors.forEach((e) => console.log(`  - ${e}`));
    }

    expect(response?.status()).toBeLessThan(500);
  });

  test("login page loads", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto(`${PROD_URL}/login`, { timeout: 30000 });
    console.log(`Login page status: ${response?.status()}`);

    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: "e2e/screenshots/prod-login.png", fullPage: true });

    if (consoleErrors.length > 0) {
      console.log("Console errors on login page:");
      consoleErrors.forEach((e) => console.log(`  - ${e}`));
    }

    expect(response?.status()).toBeLessThan(500);
  });

  test("authenticated pages load after login", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const networkErrors: string[] = [];
    page.on("requestfailed", (req) => {
      networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Login
    await page.goto(`${PROD_URL}/login`, { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill("rjoberlander@gmail.com");
      await page.fill('input[type="password"]', "Cookie123!");
      await page.click('button:has-text("Sign in")');
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
      console.log(`After login, landed on: ${page.url()}`);
    } else {
      console.log("No login form found - may already be logged in or page didn't render");
      await page.screenshot({ path: "e2e/screenshots/prod-no-login-form.png", fullPage: true });
    }

    await page.waitForLoadState("networkidle").catch(() => {});
    await page.screenshot({ path: "e2e/screenshots/prod-after-login.png", fullPage: true });

    // Check the dashboard / main page
    const pages_to_check = [
      { name: "dashboard", path: "/" },
      { name: "travel", path: "/travel" },
      { name: "settings", path: "/settings" },
    ];

    for (const p of pages_to_check) {
      consoleErrors.length = 0;
      const resp = await page.goto(`${PROD_URL}${p.path}`, { timeout: 30000 });
      console.log(`${p.name} page status: ${resp?.status()}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/prod-${p.name}.png`, fullPage: true });

      if (consoleErrors.length > 0) {
        console.log(`Console errors on ${p.name}:`);
        consoleErrors.forEach((e) => console.log(`  - ${e}`));
      }
    }

    if (networkErrors.length > 0) {
      console.log("Network errors:");
      networkErrors.forEach((e) => console.log(`  - ${e}`));
    }
  });

  test("API health check", async ({ request }) => {
    // Check if the API endpoint responds
    const endpoints = [
      `${PROD_URL}/api`,
      `${PROD_URL}/api/health`,
    ];

    for (const url of endpoints) {
      try {
        const resp = await request.get(url, { timeout: 15000 });
        console.log(`${url} -> ${resp.status()}`);
      } catch (e: any) {
        console.log(`${url} -> FAILED: ${e.message}`);
      }
    }
  });
});
