import { test, expect } from "@playwright/test";

const pages = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/biomarkers", name: "Biomarkers" },
  { path: "/supplements", name: "Supplements" },
  { path: "/equipment", name: "Equipment" },
  { path: "/routines", name: "Routines" },
  { path: "/goals", name: "Goals" },
  { path: "/changelog", name: "Change Log" },
  { path: "/docs", name: "Protocol Docs" },
  { path: "/chat", name: "AI Chat" },
  { path: "/settings", name: "Settings" },
];

test("check all pages load", async ({ page }) => {
  // Login first
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "rjoberlander@gmail.com");
  await page.fill('input[type="password"]', "Cookie123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  const results: { page: string; status: string; error?: string }[] = [];

  for (const p of pages) {
    await page.goto("http://localhost:3000" + p.path);
    await page.waitForTimeout(2000);

    // Check for "Failed to load" error messages (exclude Dashboard which has Critical biomarker badges)
    const failedText = await page.locator("text=/Failed to load/i").count();

    if (failedText > 0) {
      results.push({ page: p.name, status: "FAILED", error: "Failed to load message found" });
    } else {
      results.push({ page: p.name, status: "OK" });
    }
  }

  // Print results
  console.log("\n=== Page Load Results ===");
  for (const r of results) {
    const errorMsg = r.error ? " - " + r.error : "";
    console.log(r.page + ": " + r.status + errorMsg);
  }

  // Fail test if any page failed
  const failed = results.filter(r => r.status === "FAILED");
  expect(failed.length, "Pages failed: " + failed.map(f => f.page).join(", ")).toBe(0);
});
