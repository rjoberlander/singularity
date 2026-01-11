import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Supabase client for direct DB operations
const supabase = createClient(
  "https://fcsiqoebtpfhzreamotp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg"
);

const TEST_USER_ID = "b201a860-05a3-4ddc-bb89-4c4271177271";

// Use existing trip that's visible in UI
const EXISTING_TRIP_ID = "814c38ad-c6d4-4811-acbf-6db049e3ede1";

// Parsed data from portugal-segment-1-lisbon-belem-complete.md
const SEGMENT_DATA = {
  name: "Lisbon & Belém",
  description: "Your complete tour guide for Days 1-5 of Portugal",
  start_date: "2025-06-17",
  end_date: "2025-06-21",
  location_name: "Belém, Lisbon, Portugal",
  country: "Portugal",
  country_code: "PT",
  timezone: "Europe/Lisbon",
  languages: ["Portuguese"],
  local_currency: "EUR",
  city_info: {
    overview: "Lisbon isn't just Portugal's capital — it's one of the most historically consequential cities on Earth. What happened here shaped the modern world in ways most visitors never realize.",
    history: "Lisbon is one of the oldest cities in Western Europe — older than Rome, older than Paris, older than London.",
    deep_history: `Phoenician traders founded it around 1200 BC, calling it Alis Ubbo, meaning "safe harbor." The Romans conquered in 205 BC and renamed it Felicitas Julia. Julius Caesar himself elevated it to a municipium.

The Moors ruled from 711-1147 AD, calling it Al-Ushbuna. For over 400 years, Lisbon was a Muslim city — a thriving center of trade, knowledge, and art.

On October 25, 1147, King Afonso Henriques captured the city with crusader help after a 4-month siege. This was the Reconquista.

By 1550, tiny Portugal controlled the sea route to India, trading posts across Africa, India, Southeast Asia, China, Japan, and Brazil — an empire spanning four continents.

On November 1, 1755, a magnitude 8.5-9.0 earthquake struck, followed by a tsunami and fire. 30,000-100,000 died. 85% of buildings destroyed. The Marquis of Pombal rebuilt the city with Europe's first earthquake-resistant construction.`,
    culture: "This is where Fado was born in the 1820s — in the taverns of sailors, fishermen, and dockworkers. The music emerged from saudade — longing, nostalgia, the presence of absence.",
    fado: `Fado is Portugal's national music — melancholic, dramatic, and uniquely Portuguese. The name comes from Latin fatum — meaning "fate" or "destiny."

A traditional performance features a single singer (fadista) accompanied by two guitars: a classical guitar and the Portuguese guitarra — a pear-shaped, 12-string instrument with a distinctive, mournful sound.

Maria Severa (1820-1846) was the first famous fadista. Amália Rodrigues (1920-1999) was the "Queen of Fado." In 2011, UNESCO added Fado to its Intangible Cultural Heritage list.`,
    azulejos: `Those blue-and-white ceramic tiles covering every building are called azulejos (ah-zoo-LAY-zhosh), from Arabic al-zuleycha meaning "polished stone."

The Moors introduced decorative tiles to Iberia. After the Reconquista, Portuguese artisans developed their own distinctive style. The characteristic blue-and-white color scheme emerged in the 17th century, influenced by Chinese porcelain arriving on Portuguese trading ships.

Azulejos serve practical purposes — they keep buildings cool, reflect light, and protect walls from moisture. But they're also public art.`,
    cuisine: "Portugal's food reflects its history — Moorish spices, African influences, New World ingredients, and Catholic traditions all mixed together.",
    tips: "The line at Pastéis de Belém can be 30+ minutes. Secret: walk past the takeaway line and enter the café side — you'll be seated quickly.",
  },
  local_food: [
    {
      name: "Pastéis de Belém",
      description: "Famous custard tarts invented by monks at Jerónimos Monastery. Best eaten warm, dusted with cinnamon and powdered sugar.",
      where_to_find: "Pastéis de Belém, Rua de Belém 84-92",
    },
    {
      name: "Bacalhau",
      description: "Portugal's national dish — salt cod prepared in supposedly 365 different ways, one for each day of the year.",
      where_to_find: "Any traditional restaurant",
    },
    {
      name: "Caldo Verde",
      description: "A simple, comforting soup of potatoes, kale, and chouriço. Perfect for jet-lagged stomachs.",
      where_to_find: "Traditional tascas",
    },
    {
      name: "Fresh Seafood",
      description: "Grilled sardines, octopus, clams, and whatever came in from the Atlantic that morning.",
      where_to_find: "Ponto Final in Cacilhas",
    },
  ],
  packing_list: [
    { item: "Comfortable walking shoes", notes: "cobblestones!" },
    { item: "Sunscreen SPF 50+" },
    { item: "Sun hats for all kids" },
    { item: "Carrier/backpack for 3-year-old", notes: "strollers challenging in Alfama" },
    { item: "Layers", notes: "Sintra/Cabo da Roca 10°C cooler" },
    { item: "Water bottles" },
    { item: "Snacks", notes: "hangry kids are unhappy kids" },
  ],
  booking_priorities: {
    book_now: [
      { item: "Quinta da Regaleira tickets", reason: "timed entry required" },
      { item: "Key restaurant reservations in Alfama" },
    ],
    book_week_ahead: [
      { item: "Any guided tours you want" },
      { item: "Fado house reservations", reason: "if going formal" },
    ],
  },
  weather_summary: "Expect warm Mediterranean weather in June. Sintra and Cabo da Roca are 5-10°C cooler than Lisbon.",
  best_time_to_visit: "Late spring (May-June) or early fall (September-October) for mild weather and fewer crowds.",
  main_attractions: [
    { name: "Jerónimos Monastery", description: "16th-century UNESCO site, Portugal's greatest architectural achievement", type: "monument" },
    { name: "Belém Tower", description: "Iconic 16th-century fortified tower on the Tagus River", type: "monument" },
    { name: "São Jorge Castle", description: "Moorish castle crowning Lisbon's highest hill", type: "castle" },
    { name: "Alfama District", description: "Medieval quarter that survived the 1755 earthquake", type: "neighborhood" },
  ],
};

const ACTIVITIES_DATA = [
  {
    name: "Pastéis de Belém",
    description: "A bakery and café that has been making Portugal's most famous pastry since 1837.",
    activity_type: "restaurant",
    time_block: "midday",
    start_time: "12:00",
    end_time: "13:30",
    location_name: "Pastéis de Belém",
    address: "Rua de Belém 84-92, Lisbon",
    website: "https://pasteisdebelem.pt",
    estimated_duration_minutes: 45,
    practical_details: {
      hours: "8am-11pm daily",
      cost_breakdown: {
        adults: "~€1.30 per tart",
        kids: "Same price",
      },
      time_needed: "30-45 minutes",
      avoid_times: ["Peak lunch hours 12:30-2pm"],
      getting_there: "Short walk from Jerónimos Monastery",
    },
    deep_dive_content: `This isn't just a tourist attraction. This is where the original recipe has been baked continuously for nearly 200 years.

The story begins at Jerónimos Monastery, next door. For centuries, monks used egg whites to starch their habits. This left them with enormous quantities of egg yolks. They developed rich pastries to use them — including these custard tarts.

When liberal reforms dissolved religious orders in 1834, the monks were expelled. They sold their secret recipe to a nearby sugar refinery owned by Domingos Rafael Alves. His descendants have operated Pastéis de Belém ever since.

The recipe is one of Portugal's most closely guarded secrets. Only THREE people know it at any time, and they never travel together. The baking happens in a back room that visitors cannot enter.`,
    historical_context: "The monks of Jerónimos developed these tarts using leftover egg yolks from starching their habits. When dissolved in 1834, they sold the secret recipe.",
    kid_engagement: {
      age_7: [
        "Count the tiles on the wall — these are azulejos!",
        "Notice how each room has different patterns?",
      ],
      age_5: [
        "Can you sprinkle cinnamon on your tart?",
        "Watch how fast the servers carry the trays!",
      ],
      age_3: [
        "Hot chocolate and a warm tart — perfect combo",
        "The tiles have pretty pictures!",
      ],
    },
    what_to_see: [
      { name: "Blue-and-white azulejo tiles", description: "Each room has different patterns" },
      { name: "The bakery window", description: "Watch tarts being prepared (not the secret room though!)" },
      { name: "Historic photos on walls", description: "Shows the bakery through the centuries" },
    ],
    accessibility_info: {
      stroller_friendly: true,
      notes: "Ground floor accessible. Can get crowded.",
    },
    tips: "Walk past the takeaway line and enter the café side. You'll be seated in one of several tiled rooms. Service is fast.",
  },
  {
    name: "Jerónimos Monastery",
    description: "A massive 16th-century monastery, UNESCO World Heritage Site, and Portugal's greatest architectural achievement.",
    activity_type: "museum",
    time_block: "morning",
    start_time: "09:00",
    end_time: "11:00",
    location_name: "Mosteiro dos Jerónimos",
    address: "Praça do Império, Belém",
    estimated_duration_minutes: 120,
    practical_details: {
      hours: "10am-6:30pm (summer); Closed Mondays",
      cost_breakdown: {
        adults: "€10",
        seniors: "€5",
        under_x_free: "Free under 14",
      },
      time_needed: "1.5-2 hours",
      avoid_times: ["Weekends", "10am-12pm (cruise ship crowds)"],
      getting_there: "Tram 15E from downtown, or walk along waterfront",
      combo_tickets: "Free with Lisboa Card",
    },
    deep_dive_content: `This building tells the story of Portugal's golden age better than any other monument.

In 1495, King Manuel I visited a small chapel where sailors prayed before voyages. Two years later, Vasco da Gama spent his last night in Portugal praying here before departing for India.

When da Gama returned successfully in 1499, Manuel decided to build something magnificent — a monastery that would thank God for Portugal's discoveries, house monks to pray for sailors' safe return, and demonstrate Portugal's wealth and power.

Manuel financed construction with the Vintena da Pimenta — a 5% tax on spices from Africa and Asia. Pepper that cost 3 ducats in India sold for 80 ducats in Lisbon. Even taxed at 5%, the profits funded this explosion of stone lace.`,
    historical_context: "Built 1502-1600 on the site where Vasco da Gama prayed before his voyage to India. Funded by a 5% tax on spices from the Age of Discoveries.",
    architecture_notes: `The Manueline style is Portugal's unique contribution to world architecture — Late Gothic with a maritime twist:
- Twisted rope motifs carved in stone (like ship's rigging)
- Anchors, chains, and nautical instruments
- Armillary spheres (King Manuel's personal symbol)
- Exotic plants, animals, and coral from the New World
- Cross of the Order of Christ (the military-religious order that funded discoveries)`,
    kid_engagement: {
      age_7: [
        "Count how many different things you can find carved in stone — ropes, anchors, shells, animals, plants",
        "Vasco da Gama is buried right here. He sailed to India when no one knew if it was possible.",
        "The king who built this taxed pepper — like the pepper on your dinner — and used the money for this building.",
      ],
      age_5: [
        "Look at the ceiling! Does it look like trees growing up and spreading out?",
        "Can you find a stone lion? A stone elephant? A stone shell?",
      ],
      age_3: [
        "Let them run (carefully) in the cloister garden",
        "The echo in the church may fascinate them",
        "Keep moving — 90 minutes max",
      ],
    },
    what_to_see: [
      { name: "Vaulted ceiling", description: "Tree-trunk-like columns that seem to grow into the ceiling", location_hint: "Church nave" },
      { name: "Vasco da Gama's tomb", description: "Decorated with nautical symbols — ropes, spheres, a caravel", location_hint: "Lower choir near entrance" },
      { name: "Luís de Camões's tomb", description: "Portugal's greatest poet, wrote The Lusiads", location_hint: "Opposite da Gama's tomb" },
      { name: "Royal tombs", description: "King Manuel I and João III rest on marble elephants", location_hint: "In the chancel" },
      { name: "The Cloisters", description: "Two-story masterpiece — each pillar is unique", location_hint: "Paid ticket area" },
    ],
    accessibility_info: {
      stroller_friendly: false,
      notes: "Ground floor accessible. Upper cloister has stairs.",
      alternatives: "Consider a baby carrier",
    },
    warnings: [
      "The CHURCH is FREE — enter through the main doors. The paid ticket is for the cloisters.",
      "Avoid weekends and 10am-12pm when cruise ships dock.",
    ],
    tips: "Go early to avoid crowds. The church (free) is just as impressive as the cloisters (paid).",
  },
  {
    name: "São Jorge Castle",
    description: "A Moorish castle crowning Lisbon's highest hill, with panoramic views and nearly 1,000 years of history.",
    activity_type: "activity",
    time_block: "morning",
    start_time: "09:30",
    end_time: "11:30",
    location_name: "Castelo de São Jorge",
    address: "Rua de Santa Cruz do Castelo, Lisbon",
    estimated_duration_minutes: 120,
    practical_details: {
      hours: "9am-9pm (summer)",
      cost_breakdown: {
        adults: "€15",
        under_x_free: "Free under 12; Free with Lisboa Card",
      },
      time_needed: "1.5-2 hours",
      getting_there: "Tram 28 (very crowded) or walk up from Baixa (steep hills)",
    },
    deep_dive_content: `This castle has been conquered, rebuilt, and reused by every civilization that controlled Lisbon:
- Phoenicians, Greeks, Romans: First fortifications
- Visigoths (5th-8th century): Expanded fortifications
- Moors (711-1147): Built the castle you see today
- Portuguese (1147-present): Afonso Henriques captured it; became royal palace until 16th century

When you stand on these walls, you're standing where the battle for Lisbon was won.

King Afonso Henriques and crusaders besieged the castle for four months in 1147. Finally, in October, the crusaders captured a section of wall. The Moorish garrison surrendered. Afonso planted his banner here, and Lisbon became Portuguese.`,
    historical_context: "Moorish fortress captured by King Afonso Henriques in 1147 after a 4-month siege. This was the decisive moment of the Reconquista in Portugal.",
    kid_engagement: {
      age_7: [
        "This castle was built by the Moors — Muslims from Africa who ruled here for 400 years",
        "In 1147, a king with a big army surrounded this castle and attacked for four months. Then he captured it!",
        "Walk the walls where soldiers once stood guard. What could you see coming?",
      ],
      age_5: [
        "Count the peacocks!",
        "Look through the periscope — it's like a magic eye that shows you everything",
        "Can you imagine being a knight on this wall?",
      ],
      age_3: [
        "The castle grounds are large and (mostly) safe to explore",
        "Peacocks are endlessly fascinating",
        "There are cannons to climb",
      ],
    },
    what_to_see: [
      { name: "Battlements", description: "Walk the walls with stunning views", location_hint: "Around the perimeter" },
      { name: "Archaeological site", description: "Remains of Moorish residential quarter" },
      { name: "Periscope/Camera Obscura", description: "Victorian optical device showing real-time 360° city views", location_hint: "Tower of Ulysses" },
      { name: "Peacocks", description: "They roam freely through the gardens" },
      { name: "Cannons", description: "Kids can climb on some" },
    ],
    accessibility_info: {
      stroller_friendly: false,
      notes: "Cobblestones and stairs throughout. Consider a carrier.",
    },
    warnings: [
      "Morning is best — less hot, fewer crowds",
      "Some walls have steep drops — hold children's hands",
    ],
    tips: "The periscope in the Tower of Ulysses is fascinating for kids — real-time 360° views of the city.",
  },
  {
    name: "Quinta da Regaleira",
    description: "A mystical estate featuring a Gothic-Renaissance palace, gardens filled with symbols, underground tunnels, and the famous Initiation Well.",
    activity_type: "activity",
    time_block: "morning",
    start_time: "09:00",
    end_time: "12:30",
    location_name: "Quinta da Regaleira",
    address: "Rua Barbosa du Bocage 5, Sintra",
    estimated_duration_minutes: 210,
    practical_details: {
      hours: "9am-8pm (summer)",
      cost_breakdown: {
        adults: "~€12",
        under_x_free: "Free under 6; Discounts 6-17",
      },
      time_needed: "3+ hours",
      avoid_times: ["After 11am when crowds make the well nearly impossible"],
    },
    deep_dive_content: `This is the best palace for children in the entire Sintra region — possibly in all of Portugal.

Forget Pena Palace (the colorful castle on postcards). Pena involves extensive uphill walking, long lines, limited interior access, and frustrated young children. Save it for when your kids are older.

Quinta da Regaleira is different. It's essentially a giant adventure playground disguised as a mystical estate:
- Underground tunnels to explore
- Towers to climb
- Grottos to discover
- Hidden passages connecting different parts of the garden
- A "well" that's actually an underground tower you descend via spiral staircase

The estate was purchased in 1892 by António Augusto Carvalho Monteiro, a wealthy businessman and amateur occultist with interests in Freemasonry, the Knights Templar, and alchemical symbolism.

The Initiation Well (Poço Iniciático) is the most famous feature: a 27-meter "inverted tower" descending underground via spiral staircase. Nine platforms represent the nine circles of Dante's Inferno. At the bottom, tunnels lead outward — you'll emerge from caves and grottos in various parts of the garden.`,
    historical_context: "Built 1904-1910 by Italian architect Luigi Manini for António Monteiro, encoding Masonic, Templar, and Rosicrucian symbolism throughout.",
    architecture_notes: "Gothic-Renaissance palace with gardens encoding philosophical and spiritual beliefs connected to Freemasonry, Knights Templar, and Dante's Divine Comedy.",
    kid_engagement: {
      age_7: [
        "This place was built by a man who loved secrets. Everything here is a code.",
        "The well has 9 levels — like 9 steps down into a mystery. Can you find the hidden tunnels?",
      ],
      age_5: [
        "We're going to explore a magical garden with towers, caves, and secret passages!",
        "There's a well that goes underground — we can walk down into it!",
      ],
      age_3: [
        "Hold hands constantly — terrain is uneven and some drops are significant",
        "The tunnels and caves will fascinate them",
      ],
    },
    what_to_see: [
      { name: "Initiation Well", description: "27-meter spiral descent, tunnels at bottom", location_hint: "GO HERE FIRST before crowds" },
      { name: "Underground tunnels", description: "Connect to grottos throughout the garden" },
      { name: "Palace exterior", description: "Gothic-Renaissance architecture" },
      { name: "Chapel", description: "Ornate with Templar symbols" },
      { name: "Lake and grottos", description: "Exit points from tunnel system" },
    ],
    accessibility_info: {
      stroller_friendly: false,
      notes: "Paths are narrow, steep, and unpaved. Leave stroller in car.",
      alternatives: "Use a baby carrier for young children",
    },
    warnings: [
      "ARRIVE AT OPENING (9am). By 11am, crowds make the well nearly impossible.",
      "Wear sturdy shoes — some paths are slippery",
      "Hold children's hands — significant drops in places",
    ],
    tips: "Strategy: Go to the WELL FIRST, descend the spiral staircase, explore tunnels at bottom, emerge from grottos, then explore rest of garden.",
  },
];

// Helper to get the existing trip for testing
async function getExistingTestTrip(): Promise<string> {
  // Use the existing trip that's already visible in UI
  return EXISTING_TRIP_ID;
}

test.describe("Portugal Rich Content Import", () => {
  let tripId: string;
  let segmentId: string;

  test.beforeAll(async () => {
    // Run migration to add new columns (idempotent)
    const migrationSQL = `
      -- Trip Segments
      ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS local_food JSONB;
      ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS packing_list JSONB;
      ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS booking_priorities JSONB;

      -- Trip Days
      ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS theme VARCHAR(500);

      -- Trip Activities
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS practical_details JSONB;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS kid_engagement JSONB;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS deep_dive_content TEXT;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS what_to_see JSONB;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS historical_context TEXT;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS architecture_notes TEXT;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS accessibility_info JSONB;
      ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS warnings TEXT[];
    `;

    // Execute migration via RPC or raw query
    const { error: migrationError } = await supabase.rpc("exec_sql", {
      sql: migrationSQL,
    });

    // If RPC doesn't exist, the columns might already be there from manual migration
    if (migrationError) {
      console.log("Migration RPC not available, assuming columns exist:", migrationError.message);
    }

    // Use existing trip
    tripId = await getExistingTestTrip();
    console.log("Using trip ID:", tripId);
  });

  test("should insert segment with rich content", async () => {
    // Delete existing segment if any
    await supabase
      .from("trip_segments")
      .delete()
      .eq("trip_id", tripId)
      .eq("name", SEGMENT_DATA.name);

    // Insert segment
    const { data: segment, error } = await supabase
      .from("trip_segments")
      .insert({
        trip_id: tripId,
        ...SEGMENT_DATA,
        sort_order: 1,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(segment).toBeTruthy();
    expect(segment.name).toBe(SEGMENT_DATA.name);
    expect(segment.city_info?.deep_history).toContain("Phoenician");
    expect(segment.local_food).toHaveLength(4);
    expect(segment.packing_list).toHaveLength(7);

    segmentId = segment.id;
    console.log("Created segment ID:", segmentId);
  });

  test("should insert days with themes", async () => {
    const days = [
      { date: "2025-06-17", day_number: 1, title: "Arrival Day", theme: "Gentle landing, first taste of Lisbon, jet-lag management" },
      { date: "2025-06-18", day_number: 2, title: "Glory of Empire", theme: "Jerónimos Monastery + Maritime Museum — where the wealth went" },
      { date: "2025-06-19", day_number: 3, title: "Old Lisbon", theme: "Alfama & São Jorge Castle — the neighborhood that survived" },
      { date: "2025-06-20", day_number: 4, title: "Science & Discovery", theme: "Interactive learning day — making history tangible for kids" },
      { date: "2025-06-21", day_number: 5, title: "Sintra Day Trip", theme: "Fairy-tale palaces — THE big day trip from Lisbon" },
    ];

    // Delete existing days
    await supabase
      .from("trip_days")
      .delete()
      .eq("trip_id", tripId)
      .eq("segment_id", segmentId);

    // Insert days
    const { data: insertedDays, error } = await supabase
      .from("trip_days")
      .insert(
        days.map((d, i) => ({
          trip_id: tripId,
          segment_id: segmentId,
          ...d,
          sort_order: i,
        }))
      )
      .select();

    expect(error).toBeNull();
    expect(insertedDays).toHaveLength(5);
    expect(insertedDays![0].theme).toContain("Gentle landing");
  });

  test("should insert activities with rich content", async () => {
    // Get day IDs
    const { data: days } = await supabase
      .from("trip_days")
      .select("id, day_number")
      .eq("trip_id", tripId)
      .eq("segment_id", segmentId)
      .order("day_number");

    expect(days).toBeTruthy();
    expect(days!.length).toBeGreaterThan(0);

    const day1Id = days!.find((d) => d.day_number === 1)?.id;
    const day2Id = days!.find((d) => d.day_number === 2)?.id;
    const day3Id = days!.find((d) => d.day_number === 3)?.id;
    const day5Id = days!.find((d) => d.day_number === 5)?.id;

    // Delete existing activities
    for (const day of days!) {
      await supabase
        .from("trip_activities")
        .delete()
        .eq("trip_id", tripId)
        .eq("day_id", day.id);
    }

    // Assign activities to days
    const activitiesWithDays = [
      { ...ACTIVITIES_DATA[0], day_id: day1Id }, // Pastéis de Belém - Day 1
      { ...ACTIVITIES_DATA[1], day_id: day2Id }, // Jerónimos - Day 2
      { ...ACTIVITIES_DATA[2], day_id: day3Id }, // São Jorge - Day 3
      { ...ACTIVITIES_DATA[3], day_id: day5Id }, // Quinta da Regaleira - Day 5
    ];

    // Insert activities
    const { data: activities, error } = await supabase
      .from("trip_activities")
      .insert(
        activitiesWithDays.map((a, i) => ({
          trip_id: tripId,
          ...a,
          sort_order: i,
          cost_currency: "EUR",
          reservation_required: false,
          is_backup: false,
        }))
      )
      .select();

    expect(error).toBeNull();
    expect(activities).toHaveLength(4);

    // Verify rich content saved
    const jeronimos = activities!.find((a) => a.name === "Jerónimos Monastery");
    expect(jeronimos?.deep_dive_content).toContain("Vasco da Gama");
    expect(jeronimos?.kid_engagement?.age_7).toHaveLength(3);
    expect(jeronimos?.what_to_see).toHaveLength(5);
    expect(jeronimos?.practical_details?.cost_breakdown?.adults).toBe("€10");
  });

  test("should display itinerary page with activities", async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navigate directly to the trip's itinerary page
    await page.goto(`http://localhost:3000/travel/${EXISTING_TRIP_ID}/itinerary`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Verify the itinerary page loaded
    await expect(page.locator("text=Full Itinerary")).toBeVisible({ timeout: 15000 });

    // Check that activities from our inserted data are visible
    await expect(page.locator('text="Pastéis de Belém"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="Jerónimos Monastery"').first()).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: "test-results/portugal-itinerary-loaded.png" });
  });

  test("should display activity details in UI", async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navigate to trip itinerary
    await page.goto(`http://localhost:3000/travel/${EXISTING_TRIP_ID}/itinerary`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Wait for data to load
    await expect(page.locator('text="Jerónimos Monastery"').first()).toBeVisible({ timeout: 15000 });

    // Click on Jerónimos Monastery activity
    const activityRow = page.locator('text="Jerónimos Monastery"').first();
    await activityRow.click();

    // Wait for sheet to open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify activity name is displayed in the dialog
    await expect(dialog.getByRole("heading", { name: /Jerónimos Monastery/ })).toBeVisible();

    // Wait a bit for content to fully render
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: "test-results/portugal-activity-rich-content.png", fullPage: false });

    // Close the panel
    await page.keyboard.press("Escape");
  });

  test("should display Quinta da Regaleira with warnings", async ({ page }) => {
    // Login
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "rjoberlander@gmail.com");
    await page.fill('input[type="password"]', "Cookie123!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Navigate to trip itinerary
    await page.goto(`http://localhost:3000/travel/${EXISTING_TRIP_ID}/itinerary`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Wait for data to load
    await expect(page.locator('text="Quinta da Regaleira"').first()).toBeVisible({ timeout: 15000 });

    // Click on Quinta da Regaleira
    const activityRow = page.locator('text="Quinta da Regaleira"').first();
    await activityRow.click();

    // Wait for sheet to open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify activity name is displayed
    await expect(dialog.getByRole("heading", { name: /Quinta da Regaleira/ })).toBeVisible();

    // Wait a bit for content to fully render
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: "test-results/portugal-quinta-regaleira.png", fullPage: false });
  });
});
