import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

test("Re-import Segment 6 and verify rich content", async ({ request }) => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";
  const segmentId = "8e5d2c22-331b-4399-90b6-574bac6205a8";

  // Read the JSON file
  const jsonPath = "/Users/richard/Downloads/portugal-segment-6-peneda-geres.json";
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const payload = JSON.parse(jsonContent);

  console.log("\n=== BEFORE IMPORT ===");

  // Check Vilarinho activity before
  const { data: beforeActivity } = await supabase
    .from("trip_activities")
    .select("id, name, deep_dive, kid_engagement")
    .eq("segment_id", segmentId)
    .eq("name", "Vilarinho das Furnas Museum")
    .single();

  console.log(`Vilarinho activity before: deep_dive=${beforeActivity?.deep_dive ? "HAS DATA" : "NULL"}`);

  // Login to get auth token
  const loginResponse = await request.post("http://localhost:3002/api/v1/auth/login", {
    data: {
      email: "rjoberlander@gmail.com",
      password: "Cookie123!",
    },
  });

  const loginData = await loginResponse.json();
  const token = loginData.data?.session?.access_token;

  if (!token) {
    console.log("Login response:", JSON.stringify(loginData, null, 2));
    throw new Error("Failed to get auth token");
  }
  console.log("✓ Logged in, got token");

  // Import segment 6
  console.log("\n=== IMPORTING SEGMENT 6 ===");
  const importResponse = await request.post(`http://localhost:3002/api/v1/travel/import`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      payload,
      options: {
        trip_id: tripId,
        segment_id: segmentId,
        create_segment: false,
        create_days: true,
        create_research_items: true,
      },
    },
  });

  const importResult = await importResponse.json();
  console.log("Import result:", JSON.stringify(importResult, null, 2).substring(0, 500));

  if (!importResult.success) {
    throw new Error(`Import failed: ${importResult.error}`);
  }

  console.log(`✓ Import successful: ${importResult.created?.activities || 0} activities created`);

  // Wait a moment for DB to settle
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log("\n=== AFTER IMPORT ===");

  // Check Vilarinho activity after
  const { data: afterActivity } = await supabase
    .from("trip_activities")
    .select("id, name, deep_dive, kid_engagement, why_its_great")
    .eq("segment_id", segmentId)
    .eq("name", "Vilarinho das Furnas Museum")
    .single();

  console.log(`\nVilarinho das Furnas Museum:`);
  console.log(`  deep_dive: ${afterActivity?.deep_dive ? "HAS DATA (" + JSON.stringify(afterActivity.deep_dive).length + " chars)" : "NULL"}`);
  console.log(`  kid_engagement: ${afterActivity?.kid_engagement ? "HAS DATA (" + JSON.stringify(afterActivity.kid_engagement).length + " chars)" : "NULL"}`);
  console.log(`  why_its_great: ${afterActivity?.why_its_great ? afterActivity.why_its_great.substring(0, 80) + "..." : "NULL"}`);

  if (afterActivity?.deep_dive) {
    const dd = afterActivity.deep_dive as any;
    console.log(`  deep_dive.what_it_is: ${dd.what_it_is?.substring(0, 80) || "NONE"}...`);
  }

  if (afterActivity?.kid_engagement) {
    const ke = afterActivity.kid_engagement as any;
    console.log(`  kid_engagement.parker: ${ke.parker?.scripts ? "YES (" + ke.parker.scripts.length + " scripts)" : "NONE"}`);
  }

  // Verify the fix worked
  expect(afterActivity?.deep_dive).not.toBeNull();
  expect(afterActivity?.kid_engagement).not.toBeNull();

  console.log("\n✓ SUCCESS: Rich content is now on the activity!");
});
