import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

test("Compare skeleton to database and show differences", async () => {
  const supabase = createClient(
    "https://fcsiqoebtpfhzreamotp.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
  );

  const tripId = "2e2ae20a-832b-4e7c-9419-2afdb506b6ab";

  // Read skeleton file
  const skeletonContent = fs.readFileSync("/Users/richard/Downloads/portugal-summer-2026-trip-skeleton.json", "utf-8");
  const skeleton = JSON.parse(skeletonContent);

  // Get current segments from DB
  const { data: dbSegments } = await supabase
    .from("trip_segments")
    .select("id, segment_number, name, start_date, end_date")
    .eq("trip_id", tripId)
    .order("segment_number");

  console.log("\n========================================");
  console.log("SKELETON vs DATABASE COMPARISON");
  console.log("========================================\n");

  // Calculate nights from dates
  const calculateNights = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const changes: any[] = [];

  for (const skelSeg of skeleton.segments) {
    const dbSeg = dbSegments?.find(s => s.segment_number === skelSeg.segment_number);

    const skelNights = skelSeg.nights;
    const skelStart = skelSeg.start_date;
    const skelEnd = skelSeg.end_date;

    const dbStart = dbSeg?.start_date;
    const dbEnd = dbSeg?.end_date;
    const dbNights = dbStart && dbEnd ? calculateNights(dbStart, dbEnd) : null;

    const datesMatch = skelStart === dbStart && skelEnd === dbEnd;
    const nightsMatch = skelNights === dbNights;

    console.log(`Segment ${skelSeg.segment_number}: ${skelSeg.name}`);
    console.log(`  Skeleton: ${skelStart} to ${skelEnd} (${skelNights} nights)`);
    console.log(`  Database: ${dbStart} to ${dbEnd} (${dbNights} nights)`);

    if (datesMatch) {
      console.log(`  ✓ MATCH - No changes needed`);
    } else if (nightsMatch) {
      console.log(`  ⚠ DATES DIFFER but nights match - Can update dates safely`);
      changes.push({
        segment_number: skelSeg.segment_number,
        name: skelSeg.name,
        db_id: dbSeg?.id,
        action: "update_dates",
        old_dates: { start: dbStart, end: dbEnd },
        new_dates: { start: skelStart, end: skelEnd },
        nights: skelNights,
      });
    } else {
      console.log(`  ❌ NIGHTS DIFFER - ${dbNights} vs ${skelNights}`);
      changes.push({
        segment_number: skelSeg.segment_number,
        name: skelSeg.name,
        db_id: dbSeg?.id,
        action: "nights_mismatch",
        old_dates: { start: dbStart, end: dbEnd },
        new_dates: { start: skelStart, end: skelEnd },
        old_nights: dbNights,
        new_nights: skelNights,
      });
    }
    console.log("");
  }

  console.log("========================================");
  console.log("CHANGES NEEDED:");
  console.log("========================================\n");

  if (changes.length === 0) {
    console.log("✓ No changes needed - all segments match!");
  } else {
    for (const change of changes) {
      if (change.action === "update_dates") {
        console.log(`${change.segment_number}. ${change.name}: Update dates`);
        console.log(`   FROM: ${change.old_dates.start} to ${change.old_dates.end}`);
        console.log(`   TO:   ${change.new_dates.start} to ${change.new_dates.end}`);
        console.log(`   (${change.nights} nights - SAME)`);
      } else {
        console.log(`${change.segment_number}. ${change.name}: NIGHTS MISMATCH`);
        console.log(`   Current: ${change.old_nights} nights (${change.old_dates.start} to ${change.old_dates.end})`);
        console.log(`   Skeleton: ${change.new_nights} nights (${change.new_dates.start} to ${change.new_dates.end})`);
        console.log(`   ⚠ Need to extend/shrink segment by ${change.new_nights - change.old_nights} day(s)`);
      }
      console.log("");
    }
  }

  expect(dbSegments?.length).toBeGreaterThan(0);
});
