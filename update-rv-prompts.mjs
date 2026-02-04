import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lhwvfmnakvxjzvnpmocr.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3ZmbW5ha3Z4anp2bnBtb2NyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjEzMTg1MSwiZXhwIjoyMDUxNzA3ODUxfQ.3wnEfPnDgXvLrLCyGwwpVf7VULg7v9l07bOhc5ZWJW0";

const supabase = createClient(supabaseUrl, supabaseKey);

const researchPrompts = [
  {
    id: 1,
    name: "Southern California Desert Region",
    region: "Southern California & Deserts",
    drive_time: "2-4 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Southern California's desert regions within 2-4 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT - not multiple campgrounds at the same park. For each destination, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Joshua Tree National Park (ONE best campground for our rig)
- Anza-Borrego Desert State Park
- Salton Sea area
- Palm Springs Aerial Tramway / Indian Canyons
- Mojave National Preserve
- Red Rock Canyon State Park (California)
- Antelope Valley (poppy fields, aerospace)
- Temecula wine country
- Idyllwild mountain town
- Big Morongo Canyon Preserve
- Pioneertown / Rimrock area
- Desert Hot Springs
- Borrego Springs town
- Fonts Point / Badlands

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 2,
    name: "Southern California Coastal & Mountains",
    region: "Southern California Coast/Mountains",
    drive_time: "2-4 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS along the Southern California coast and mountains within 2-4 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, paddleboard, and bikes.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Santa Barbara (ONE campground recommendation)
- Channel Islands National Park (staging area)
- Carpinteria Beach area
- Morro Bay / Morro Rock
- Pismo Beach / Oceano Dunes
- Avila Beach / hot springs
- San Simeon / Hearst Castle area
- Big Bear Lake
- Lake Arrowhead / Running Springs
- Idyllwild
- Julian (apple pie town, observatory)
- Palomar Mountain
- Lake Cachuma
- Ojai valley
- Ventura Harbor area

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 3,
    name: "Central California - Sequoias to Coast",
    region: "Central California",
    drive_time: "4-6 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Central California within 4-6 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Sequoia National Park (ONE best campground)
- Kings Canyon National Park
- Pinnacles National Park
- Monterey / Pacific Grove
- Carmel-by-the-Sea area
- Point Lobos area
- Paso Robles wine country
- San Simeon elephant seals
- Morro Bay
- Lake Nacimiento
- Lake San Antonio
- Fresno Blossom Trail (spring)
- Bass Lake
- Shaver Lake
- Cambria

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 4,
    name: "Eastern Sierra - Bishop to Tahoe",
    region: "Eastern Sierra",
    drive_time: "4-8 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in the Eastern Sierra from Bishop to Lake Tahoe. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, and paddleboard.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Mammoth Lakes (ONE campground)
- June Lake Loop
- Mono Lake / Lee Vining
- Bodie Ghost Town area
- Bridgeport / Twin Lakes
- Hot Creek geothermal area
- Ancient Bristlecone Pine Forest
- Bishop (Buttermilk boulders, Owens River)
- Convict Lake
- Lake Tahoe South Shore
- Lake Tahoe North Shore / Tahoe City
- Donner Lake / Truckee
- Wild Willy's Hot Springs area
- Alabama Hills (Lone Pine)
- Keough's Hot Springs area

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 5,
    name: "Death Valley & Nevada",
    region: "Death Valley/Nevada",
    drive_time: "4-7 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Death Valley and Nevada. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Death Valley National Park (ONE best campground)
- Tecopa Hot Springs
- Valley of Fire State Park (Nevada)
- Red Rock Canyon (Nevada)
- Rhyolite Ghost Town
- Ash Meadows National Wildlife Refuge
- Pahrump / Spring Mountain Ranch
- Cathedral Gorge State Park (Nevada)
- Great Basin National Park (Nevada - Lehman Caves!)
- Berlin-Ichthyosaur State Park
- Trona Pinnacles
- Shoshone / China Ranch Date Farm
- Saline Valley (if accessible)
- Amargosa Opera House area
- Goldfield / Tonopah ghost towns

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 6,
    name: "Arizona - Sedona to Grand Canyon",
    region: "Northern Arizona",
    drive_time: "5-8 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Northern Arizona. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Grand Canyon South Rim (ONE campground)
- Sedona (red rocks, vortexes)
- Flagstaff (Lowell Observatory, downtown)
- Slide Rock State Park
- Jerome ghost town
- Montezuma Castle / Montezuma Well
- Meteor Crater
- Petrified Forest National Park
- Painted Desert
- Walnut Canyon
- Sunset Crater Volcano
- Wupatki National Monument
- Horseshoe Bend (Page, AZ)
- Antelope Canyon area
- Havasu Falls area (if accessible)

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 7,
    name: "Arizona - Southern Desert",
    region: "Southern Arizona",
    drive_time: "5-7 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Southern Arizona. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Saguaro National Park (ONE camping option)
- Kartchner Caverns State Park
- Tombstone (OK Corral, history)
- Bisbee (quirky art town)
- Chiricahua National Monument
- Organ Pipe Cactus National Monument
- Colossal Cave Mountain Park
- Arizona-Sonora Desert Museum area
- Sabino Canyon
- Mt. Lemmon / Tucson mountains
- Patagonia Lake / wine country
- Casa Grande Ruins
- Picacho Peak State Park
- Superstition Mountains
- Tonto Natural Bridge State Park

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 8,
    name: "Utah - National Parks & Beyond",
    region: "Utah",
    drive_time: "6-10 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS across Utah. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Zion National Park (ONE campground)
- Bryce Canyon National Park
- Capitol Reef National Park
- Arches National Park
- Canyonlands National Park
- Goblin Valley State Park
- Dead Horse Point State Park
- Kodachrome Basin State Park
- Coral Pink Sand Dunes
- Snow Canyon State Park
- Natural Bridges National Monument
- Monument Valley
- Lake Powell / Glen Canyon
- Moab town (biking, rafting base)
- Grand Staircase-Escalante (slot canyons)

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 9,
    name: "Oregon - Crater Lake to Coast",
    region: "Oregon",
    drive_time: "10-14 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Oregon. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, and paddleboard.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Crater Lake National Park (ONE campground)
- Bend (Deschutes River, breweries)
- Smith Rock State Park
- Newberry Volcanic Monument
- Painted Hills / John Day Fossil Beds
- Oregon Dunes National Recreation Area
- Bandon Beach (sea stacks)
- Cape Perpetua / Thor's Well
- Cannon Beach / Haystack Rock
- Columbia River Gorge / Multnomah Falls
- Mt. Hood / Timberline Lodge area
- Lava Beds National Monument (California border)
- Ashland (Shakespeare festival)
- Silver Falls State Park
- Oregon Caves National Monument

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 10,
    name: "New Mexico - Land of Enchantment",
    region: "New Mexico",
    drive_time: "8-12 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS across New Mexico. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- White Sands National Park
- Carlsbad Caverns National Park
- Santa Fe (history, art, culture)
- Bandelier National Monument
- Tent Rocks / Kasha-Katuwe
- Taos (Pueblo, Rio Grande Gorge)
- Chaco Culture National Historic Park
- Gila Cliff Dwellings
- Roswell (UFO tourism)
- City of Rocks State Park
- Bosque del Apache (bird migration)
- El Malpais National Monument
- Bisti Badlands
- Meow Wolf (Santa Fe - indoor!)
- Faywood Hot Springs area

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 11,
    name: "Colorado Rockies",
    region: "Colorado",
    drive_time: "10-14 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Colorado. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option. Note altitude considerations for young kids.

Destinations to consider (pick the best 10-15):
- Rocky Mountain National Park (ONE campground)
- Mesa Verde National Park (cliff dwellings!)
- Great Sand Dunes National Park
- Black Canyon of the Gunnison
- Garden of the Gods
- Pikes Peak area
- Durango (train to Silverton)
- Glenwood Springs (hot springs, caves)
- Colorado National Monument
- Dinosaur National Monument
- Maroon Bells area
- Telluride / Ouray (Million Dollar Highway)
- Royal Gorge
- Florissant Fossil Beds
- Grand Lake / Shadow Mountain

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics (including altitude!), pros/cons.

Return 10-15 distinct destinations as JSON.`
  },
  {
    id: 12,
    name: "Big Bend & West Texas",
    region: "Big Bend/West Texas",
    drive_time: "12-14 hours from LA",
    target: "10-15 distinct destinations",
    prompt: `Research 10-15 DISTINCT DESTINATIONS in Big Bend and West Texas. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

IMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.

Destinations to consider (pick the best 10-15):
- Big Bend National Park (ONE campground)
- Big Bend Ranch State Park
- Guadalupe Mountains National Park
- Marfa (art, Prada Marfa, mystery lights)
- Terlingua ghost town
- Fort Davis / Davis Mountains
- McDonald Observatory
- Balmorhea State Park (spring-fed pool!)
- Hueco Tanks State Park
- Seminole Canyon State Park (pictographs)
- Langtry / Judge Roy Bean
- Santa Elena Canyon
- Chinati Hot Springs
- Franklin Mountains State Park
- Palo Duro Canyon (if in range)

For each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.

Return 10-15 distinct destinations as JSON.`
  }
];

async function updatePrompts() {
  console.log("Updating research prompts in database...");

  const { data, error } = await supabase
    .from("rv_research_settings")
    .update({ research_prompts: researchPrompts })
    .eq("user_id", "b201a860-05a3-4ddc-bb89-4c4271177271")
    .select();

  if (error) {
    console.error("Error updating prompts:", error);

    // Try insert if update fails
    console.log("Trying insert instead...");
    const { data: insertData, error: insertError } = await supabase
      .from("rv_research_settings")
      .insert({
        user_id: "b201a860-05a3-4ddc-bb89-4c4271177271",
        research_prompts: researchPrompts
      })
      .select();

    if (insertError) {
      console.error("Insert also failed:", insertError);
      return;
    }
    console.log("Inserted successfully:", insertData);
    return;
  }

  console.log("Updated successfully!");
  console.log(`Stored ${researchPrompts.length} research prompts`);

  // List them
  console.log("\nAvailable prompts:");
  researchPrompts.forEach(p => {
    console.log(`  ${p.id}. ${p.name} (${p.region}) - ${p.drive_time}`);
  });
}

updatePrompts();
