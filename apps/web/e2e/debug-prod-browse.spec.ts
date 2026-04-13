import { test } from "@playwright/test";

// One-off debug: load the prod /login page and capture the client-side
// exception that is crashing the app shell.
test("capture client-side crash on singularity.boo/login", async ({ page }) => {
  test.setTimeout(60_000);

  const logs: string[] = [];
  page.on("console", (msg) => {
    logs.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    logs.push(`[pageerror] ${err.name}: ${err.message}\n${err.stack || ""}`);
  });
  page.on("requestfailed", (req) => {
    logs.push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      logs.push(`[http${resp.status()}] ${resp.request().method()} ${resp.url()}`);
    }
  });

  await page.goto("https://singularity.boo/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  const bodyText = await page.locator("body").innerText().catch(() => "<no body>");
  console.log("=== BODY TEXT ===");
  console.log(bodyText.slice(0, 800));
  console.log("=== LOGS ===");
  for (const m of logs) console.log(m);
});
