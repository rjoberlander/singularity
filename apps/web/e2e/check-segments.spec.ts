import { test } from "@playwright/test";

test("Check segments data", async ({ page }) => {
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

  // Make API calls using captured token
  const tripData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/full", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  console.log("Trip name:", tripData.data?.name);

  // Log segment info
  console.log("\n=== SEGMENTS ===");
  if (tripData.data?.segments) {
    for (const seg of tripData.data.segments) {
      console.log(`#${seg.segment_number} ${seg.name} (${seg.id}): ${seg.start_date?.split("T")[0]} - ${seg.end_date?.split("T")[0]} | research_status: ${seg.research_status}`);
    }
    // Check if segment 45e4e77b-f8d6-4414-ba9d-dba695c2d73e exists
    const targetSeg = tripData.data.segments.find((s: any) => s.id === "45e4e77b-f8d6-4414-ba9d-dba695c2d73e");
    console.log(`\nTarget segment 45e4e77b exists: ${!!targetSeg}`);
    if (targetSeg) {
      console.log(`  -> ${targetSeg.name}`);
    }
  }

  // Log research items count by segment
  console.log("\n=== RESEARCH ITEMS ===");
  const itemsData = await page.evaluate(async (authToken) => {
    const resp = await fetch("http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/research-items", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    return resp.json();
  }, token);

  if (itemsData.data) {
    const bySegment: Record<string, number> = {};
    for (const item of itemsData.data) {
      const segId = item.segment_id || "null";
      bySegment[segId] = (bySegment[segId] || 0) + 1;
    }
    console.log("Items by segment ID:", bySegment);
    console.log("Total items:", itemsData.data.length);

    // Map segment IDs to names
    const segmentNames: Record<string, string> = {};
    if (tripData.data?.segments) {
      for (const seg of tripData.data.segments) {
        segmentNames[seg.id] = seg.name;
      }
    }

    // Show count per segment name
    console.log("\nItems by segment name:");
    for (const [segId, count] of Object.entries(bySegment)) {
      const name = segmentNames[segId] || segId;
      console.log(`  ${name}: ${count} items`);
    }

    // Show first few items with details
    console.log("\nFirst 10 items with segment info:");
    for (const item of itemsData.data.slice(0, 10)) {
      console.log(`- ${item.name} (${item.item_type}) | segment_id: ${item.segment_id} | created: ${item.created_at?.split("T")[0]}`);
    }

    // Check for items with non-null segment_id
    const withSegment = itemsData.data.filter((i: any) => i.segment_id);
    const withoutSegment = itemsData.data.filter((i: any) => !i.segment_id);
    console.log(`\nItems with segment_id: ${withSegment.length}`);
    console.log(`Items without segment_id: ${withoutSegment.length}`);

    // Check unique segment IDs
    const uniqueSegmentIds = new Set(itemsData.data.map((i: any) => i.segment_id).filter(Boolean));
    console.log(`Unique segment IDs: ${uniqueSegmentIds.size}`);
    for (const sid of uniqueSegmentIds) {
      console.log(`  - ${sid} (${segmentNames[sid as string] || 'unknown'})`);
    }
  }
});
