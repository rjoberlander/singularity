import { test } from "@playwright/test";
import fs from "fs";
import path from "path";

test("Test import API directly", async ({ request }) => {
  // First login to get token
  const loginResp = await request.post("http://127.0.0.1:54321/auth/v1/token?grant_type=password", {
    headers: {
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      "Content-Type": "application/json",
    },
    data: {
      email: "rjoberlander@gmail.com",
      password: "Cookie123!",
    },
  });

  const loginData = await loginResp.json();
  const token = loginData.access_token;
  console.log("Got auth token:", !!token);

  // Read JSON file
  const filePath = path.resolve("/Users/richard/Downloads/segment-1-lisbon-research.json");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const payload = JSON.parse(fileContent);

  console.log("Payload dates:", payload.metadata?.dates);
  console.log("Payload segment_number:", payload.metadata?.segment_number);

  // Get Lisbon segment ID
  const tripResp = await request.get(
    "http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/full",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const tripData = await tripResp.json();
  const lisbonSegment = tripData.data?.segments?.find((s: any) => s.segment_number === 1);
  console.log("Lisbon segment:", lisbonSegment?.id, lisbonSegment?.name);

  // Validate first
  const validateResp = await request.post("http://localhost:3002/api/v1/travel/import/validate", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: payload,
  });

  const validateData = await validateResp.json();
  console.log("\n=== VALIDATION ===");
  console.log("Valid:", validateData.valid);
  console.log("Issues:", validateData.issues);
  console.log("Summary:", validateData.summary);

  if (!validateData.valid) {
    console.log("Validation failed, skipping import");
    return;
  }

  // Import
  const importResp = await request.post("http://localhost:3002/api/v1/travel/import", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      payload,
      options: {
        create_trip: false,
        create_segment: false,
        create_days: true,
        create_research_items: true,
        import_approved_as_activities: false,
        auto_approve_must_do: true,
        trip_id: "2e2ae20a-832b-4e7c-9419-2afdb506b6ab",
        segment_id: lisbonSegment?.id,
      },
    },
  });

  const importData = await importResp.json();
  console.log("\n=== IMPORT RESULT ===");
  console.log(JSON.stringify(importData, null, 2));

  // Check final state
  const finalResp = await request.get(
    "http://localhost:3002/api/v1/travel/trips/2e2ae20a-832b-4e7c-9419-2afdb506b6ab/full",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const finalData = await finalResp.json();

  const finalLisbon = finalData.data?.segments?.find((s: any) => s.segment_number === 1);
  const lisbonDays = finalData.data?.days?.filter((d: any) => d.segment_id === finalLisbon?.id) || [];
  const lisbonActivities = finalData.data?.activities?.filter((a: any) => {
    const day = finalData.data?.days?.find((d: any) => d.id === a.day_id);
    return day?.segment_id === finalLisbon?.id;
  }) || [];

  console.log("\n=== FINAL STATE ===");
  console.log("Lisbon segment:", finalLisbon?.id);
  console.log("Lisbon dates:", finalLisbon?.start_date?.split("T")[0], "-", finalLisbon?.end_date?.split("T")[0]);
  console.log("Lisbon research_status:", finalLisbon?.research_status);
  console.log("Days:", lisbonDays.length);
  console.log("Activities:", lisbonActivities.length);

  if (lisbonActivities.length > 0) {
    console.log("\nSample activities:");
    for (const act of lisbonActivities.slice(0, 10)) {
      console.log(`  - ${act.start_time || "?"} ${act.name} (${act.activity_type})`);
    }
  }
});
