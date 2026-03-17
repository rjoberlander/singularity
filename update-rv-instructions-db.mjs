import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Production Supabase
const supabaseUrl = "https://cymbadkegbibhxbfevuq.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bWJhZGtlZ2JpYmh4YmZldnVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc3MTQxOCwiZXhwIjoyMDg5MzQ3NDE4fQ.ugP-03Gv2buAILoeEt3HM7kKzYyP8EFmVlUTMPsAB1w";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateInstructions() {
  // Read the instructions from the markdown file
  const instructionsPath = path.join(process.cwd(), "docs/rv-research-instructions.md");
  const instructions = fs.readFileSync(instructionsPath, "utf-8");

  console.log("Updating RV research instructions in database...");
  console.log(`Instructions length: ${instructions.length} characters`);

  const { data, error } = await supabase
    .from("rv_research_settings")
    .update({ claude_instructions: instructions })
    .eq("user_id", "b201a860-05a3-4ddc-bb89-4c4271177271")
    .select();

  if (error) {
    console.error("Error updating instructions:", error);
    return;
  }

  console.log("Updated successfully!");
  console.log(`Claude instructions now include ${instructions.split("### Prompt").length - 1} research prompts`);
}

updateInstructions().catch(console.error);
