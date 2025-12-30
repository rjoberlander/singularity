// Quick script to verify supplement was saved
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qicgwomxlffzlxffmjxw.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query supplements with omega/fish/krill in name
  const { data, error } = await supabase
    .from("supplements")
    .select("name, brand, timing, timing_reason, reason, mechanism, purchase_url, goal_categories:supplement_goals(goal_id)")
    .or("name.ilike.%omega%,name.ilike.%fish%,name.ilike.%krill%");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Found supplements:");
  console.log(JSON.stringify(data, null, 2));
}

main();
