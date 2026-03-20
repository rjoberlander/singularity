import { test, expect } from "@playwright/test";

const EMAIL = "rjoberlander@gmail.com";
const PASSWORD = "Cookie123!";
const API_URL = "http://localhost:3002/api/v1";

test.describe("Broadcast: Create and Vote", () => {
  test.describe.configure({ mode: "serial" });

  let authToken: string;
  let broadcastEntryId: string;
  let recipientToken: string;

  test("Step 1: Login and get auth token", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Capture auth token from a subsequent API request
    const tokenPromise = new Promise<string>((resolve) => {
      page.on("request", (req) => {
        const auth = req.headers()["authorization"];
        if (auth && auth.startsWith("Bearer ")) {
          resolve(auth.replace("Bearer ", ""));
        }
      });
    });

    // Trigger an API call by navigating to journal
    await page.goto("http://localhost:3000/journal");
    await page.waitForTimeout(2000);

    authToken = await Promise.race([
      tokenPromise,
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("No auth token captured")), 10000)
      ),
    ]);

    expect(authToken).toBeTruthy();
    console.log("Auth token captured:", authToken.substring(0, 20) + "...");
  });

  test("Step 2: Create broadcast via API with voting", async ({ request }) => {
    // Create broadcast directly via API (faster than UI for testing)
    const response = await request.post(`${API_URL}/journal/broadcast`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      data: {
        title: "Playwright Test Broadcast",
        content:
          "This is a test broadcast created by Playwright. It includes voting to verify the full flow works end-to-end.",
        broadcast_message: "Test broadcast - please vote!",
        voting_enabled: true,
        voting_type: "single",
        comments_enabled: true,
        vote_options: ["Option Alpha", "Option Beta", "Option Charlie"],
        recipients: [
          {
            contact_name: "Test Recipient",
            contact_phone: null, // No phone = no SMS sent
            contact_email: "test@example.com",
          },
        ],
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.entry).toBeTruthy();
    expect(body.data.recipients).toHaveLength(1);

    broadcastEntryId = body.data.entry.id;
    // The recipient has an access_token for the public view
    recipientToken = body.data.recipients[0].access_token;

    console.log("Broadcast created:", broadcastEntryId);
    console.log("Recipient token:", recipientToken.substring(0, 16) + "...");
  });

  test("Step 3: Verify broadcast status (author view)", async ({
    request,
  }) => {
    const response = await request.get(
      `${API_URL}/journal/${broadcastEntryId}/broadcast-status`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.summary.total_recipients).toBe(1);
    expect(body.data.summary.read_count).toBe(0);
    expect(body.data.summary.voted_count).toBe(0);
    expect(body.data.vote_options.length).toBe(4); // 3 custom + 1 "Other"

    console.log("Broadcast status verified - 0 reads, 0 votes, 4 options");
  });

  test("Step 4: Open public broadcast page and mark as read", async ({
    page,
  }) => {
    // Navigate to the public broadcast view
    await page.goto(`http://localhost:3000/broadcast/${recipientToken}`);

    // Wait for content to load
    await expect(
      page.getByText("Playwright Test Broadcast")
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Hi Test Recipient!")).toBeVisible();
    await expect(
      page.getByText("This is a test broadcast created by Playwright")
    ).toBeVisible();

    // Voting widget should be visible
    await expect(page.getByText("Option Alpha")).toBeVisible();
    await expect(page.getByText("Option Beta")).toBeVisible();
    await expect(page.getByText("Option Charlie")).toBeVisible();
    await expect(page.getByText("Other")).toBeVisible();

    // Comments section should be visible
    await expect(page.getByPlaceholder("Add a comment...")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/broadcast-public-view.png",
    });
    console.log("Public broadcast page loaded successfully");
  });

  test("Step 5: Submit a vote", async ({ page }) => {
    await page.goto(`http://localhost:3000/broadcast/${recipientToken}`);
    await expect(
      page.getByText("Playwright Test Broadcast")
    ).toBeVisible({ timeout: 15000 });

    // Click on Option Beta (radio button)
    await page.getByLabel("Option Beta").click();

    // Submit vote
    await page.getByRole("button", { name: /submit vote/i }).click();

    // Wait for success toast
    await expect(page.getByText("Vote submitted!")).toBeVisible({
      timeout: 5000,
    });

    await page.screenshot({
      path: "tests/screenshots/broadcast-vote-submitted.png",
    });
    console.log("Vote submitted for Option Beta");
  });

  test("Step 6: Submit a comment", async ({ page }) => {
    await page.goto(`http://localhost:3000/broadcast/${recipientToken}`);
    await expect(
      page.getByText("Playwright Test Broadcast")
    ).toBeVisible({ timeout: 15000 });

    // Type a comment
    await page
      .getByPlaceholder("Add a comment...")
      .fill("This is a test comment from Playwright!");

    // Click the send button (it's the button right next to the textarea)
    const sendButton = page.locator("button.shrink-0");
    await sendButton.click();

    // Wait for the comment to appear in the feed (more reliable than toast)
    await expect(
      page.getByText("This is a test comment from Playwright!")
    ).toBeVisible({ timeout: 10000 });

    // Wait a moment for toast
    await page.waitForTimeout(500);

    // Verify the comment appears in the feed
    await expect(
      page.getByText("This is a test comment from Playwright!")
    ).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/broadcast-comment-posted.png",
    });
    console.log("Comment posted successfully");
  });

  test("Step 7: Verify updated broadcast status", async ({ request }) => {
    const response = await request.get(
      `${API_URL}/journal/${broadcastEntryId}/broadcast-status`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    expect(body.data.summary.read_count).toBe(1);
    expect(body.data.summary.voted_count).toBe(1);
    expect(body.data.summary.comment_count).toBe(1);

    // Find the vote for "Option Beta"
    const betaOption = body.data.vote_options.find(
      (o: any) => o.label === "Option Beta"
    );
    const betaVotes = body.data.votes.filter(
      (v: any) => v.option_id === betaOption.id
    );
    expect(betaVotes.length).toBe(1);

    // Verify comment content
    expect(body.data.comments[0].content).toBe(
      "This is a test comment from Playwright!"
    );

    console.log(
      "Final status: 1 read, 1 vote (Option Beta), 1 comment - ALL VERIFIED"
    );
  });

  test("Step 8: Verify broadcast shows in journal list", async ({ page }) => {
    // Login first
    await page.goto("http://localhost:3000/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    // Go to journal
    await page.goto("http://localhost:3000/journal");
    await page.waitForTimeout(2000);

    // Click "Broadcasts" tab
    await page.getByText("Broadcasts").click();
    await page.waitForTimeout(1000);

    // Should see our broadcast card with the title
    await expect(
      page.getByText("Playwright Test Broadcast")
    ).toBeVisible({ timeout: 10000 });
    // The "Broadcasts" tab should be active (already clicked it above)
    await expect(page.getByRole("button", { name: "Broadcasts" })).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/broadcast-journal-list.png",
    });
    console.log("Broadcast visible in journal list under Broadcasts tab");
  });

  test("Step 9: Cleanup - delete broadcast", async ({ request }) => {
    const response = await request.delete(
      `${API_URL}/journal/${broadcastEntryId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    expect(response.ok()).toBeTruthy();
    console.log("Test broadcast deleted");
  });
});
