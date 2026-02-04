-- Add research_prompts column to rv_research_settings
ALTER TABLE rv_research_settings
ADD COLUMN IF NOT EXISTS research_prompts JSONB DEFAULT '[]'::jsonb;

-- Update with the 12 regional prompts
UPDATE rv_research_settings
SET research_prompts = '[
  {
    "id": 1,
    "name": "Southern California Desert Region",
    "region": "Southern California & Deserts",
    "drive_time": "2-4 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Southern California desert regions within 2-4 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT - not multiple campgrounds at the same park. For each destination, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Joshua Tree National Park (ONE best campground for our rig)\n- Anza-Borrego Desert State Park\n- Salton Sea area\n- Palm Springs Aerial Tramway / Indian Canyons\n- Mojave National Preserve\n- Red Rock Canyon State Park (California)\n- Antelope Valley (poppy fields, aerospace)\n- Temecula wine country\n- Idyllwild mountain town\n- Big Morongo Canyon Preserve\n- Pioneertown / Rimrock area\n- Desert Hot Springs\n- Borrego Springs town\n- Fonts Point / Badlands\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 2,
    "name": "Southern California Coastal & Mountains",
    "region": "Southern California Coast/Mountains",
    "drive_time": "2-4 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS along the Southern California coast and mountains within 2-4 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, paddleboard, and bikes.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Santa Barbara (ONE campground recommendation)\n- Channel Islands National Park (staging area)\n- Carpinteria Beach area\n- Morro Bay / Morro Rock\n- Pismo Beach / Oceano Dunes\n- Avila Beach / hot springs\n- San Simeon / Hearst Castle area\n- Big Bear Lake\n- Lake Arrowhead / Running Springs\n- Idyllwild\n- Julian (apple pie town, observatory)\n- Palomar Mountain\n- Lake Cachuma\n- Ojai valley\n- Ventura Harbor area\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 3,
    "name": "Central California - Sequoias to Coast",
    "region": "Central California",
    "drive_time": "4-6 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Central California within 4-6 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Sequoia National Park (ONE best campground)\n- Kings Canyon National Park\n- Pinnacles National Park\n- Monterey / Pacific Grove\n- Carmel-by-the-Sea area\n- Point Lobos area\n- Paso Robles wine country\n- San Simeon elephant seals\n- Morro Bay\n- Lake Nacimiento\n- Lake San Antonio\n- Fresno Blossom Trail (spring)\n- Bass Lake\n- Shaver Lake\n- Cambria\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 4,
    "name": "Eastern Sierra - Bishop to Tahoe",
    "region": "Eastern Sierra",
    "drive_time": "4-8 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in the Eastern Sierra from Bishop to Lake Tahoe. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, and paddleboard.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Mammoth Lakes (ONE campground)\n- June Lake Loop\n- Mono Lake / Lee Vining\n- Bodie Ghost Town area\n- Bridgeport / Twin Lakes\n- Hot Creek geothermal area\n- Ancient Bristlecone Pine Forest\n- Bishop (Buttermilk boulders, Owens River)\n- Convict Lake\n- Lake Tahoe South Shore\n- Lake Tahoe North Shore / Tahoe City\n- Donner Lake / Truckee\n- Wild Willy''s Hot Springs area\n- Alabama Hills (Lone Pine)\n- Keough''s Hot Springs area\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 5,
    "name": "Death Valley & Nevada",
    "region": "Death Valley/Nevada",
    "drive_time": "4-7 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Death Valley and Nevada. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Death Valley National Park (ONE best campground)\n- Tecopa Hot Springs\n- Valley of Fire State Park (Nevada)\n- Red Rock Canyon (Nevada)\n- Rhyolite Ghost Town\n- Ash Meadows National Wildlife Refuge\n- Pahrump / Spring Mountain Ranch\n- Cathedral Gorge State Park (Nevada)\n- Great Basin National Park (Nevada - Lehman Caves!)\n- Berlin-Ichthyosaur State Park\n- Trona Pinnacles\n- Shoshone / China Ranch Date Farm\n- Saline Valley (if accessible)\n- Amargosa Opera House area\n- Goldfield / Tonopah ghost towns\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 6,
    "name": "Arizona - Sedona to Grand Canyon",
    "region": "Northern Arizona",
    "drive_time": "5-8 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Northern Arizona. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Grand Canyon South Rim (ONE campground)\n- Sedona (red rocks, vortexes)\n- Flagstaff (Lowell Observatory, downtown)\n- Slide Rock State Park\n- Jerome ghost town\n- Montezuma Castle / Montezuma Well\n- Meteor Crater\n- Petrified Forest National Park\n- Painted Desert\n- Walnut Canyon\n- Sunset Crater Volcano\n- Wupatki National Monument\n- Horseshoe Bend (Page, AZ)\n- Antelope Canyon area\n- Havasu Falls area (if accessible)\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 7,
    "name": "Arizona - Southern Desert",
    "region": "Southern Arizona",
    "drive_time": "5-7 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Southern Arizona. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Saguaro National Park (ONE camping option)\n- Kartchner Caverns State Park\n- Tombstone (OK Corral, history)\n- Bisbee (quirky art town)\n- Chiricahua National Monument\n- Organ Pipe Cactus National Monument\n- Colossal Cave Mountain Park\n- Arizona-Sonora Desert Museum area\n- Sabino Canyon\n- Mt. Lemmon / Tucson mountains\n- Patagonia Lake / wine country\n- Casa Grande Ruins\n- Picacho Peak State Park\n- Superstition Mountains\n- Tonto Natural Bridge State Park\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 8,
    "name": "Utah - National Parks & Beyond",
    "region": "Utah",
    "drive_time": "6-10 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS across Utah. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Zion National Park (ONE campground)\n- Bryce Canyon National Park\n- Capitol Reef National Park\n- Arches National Park\n- Canyonlands National Park\n- Goblin Valley State Park\n- Dead Horse Point State Park\n- Kodachrome Basin State Park\n- Coral Pink Sand Dunes\n- Snow Canyon State Park\n- Natural Bridges National Monument\n- Monument Valley\n- Lake Powell / Glen Canyon\n- Moab town (biking, rafting base)\n- Grand Staircase-Escalante (slot canyons)\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 9,
    "name": "Oregon - Crater Lake to Coast",
    "region": "Oregon",
    "drive_time": "10-14 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Oregon. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, and paddleboard.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Crater Lake National Park (ONE campground)\n- Bend (Deschutes River, breweries)\n- Smith Rock State Park\n- Newberry Volcanic Monument\n- Painted Hills / John Day Fossil Beds\n- Oregon Dunes National Recreation Area\n- Bandon Beach (sea stacks)\n- Cape Perpetua / Thor''s Well\n- Cannon Beach / Haystack Rock\n- Columbia River Gorge / Multnomah Falls\n- Mt. Hood / Timberline Lodge area\n- Lava Beds National Monument (California border)\n- Ashland (Shakespeare festival)\n- Silver Falls State Park\n- Oregon Caves National Monument\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 10,
    "name": "New Mexico - Land of Enchantment",
    "region": "New Mexico",
    "drive_time": "8-12 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS across New Mexico. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- White Sands National Park\n- Carlsbad Caverns National Park\n- Santa Fe (history, art, culture)\n- Bandelier National Monument\n- Tent Rocks / Kasha-Katuwe\n- Taos (Pueblo, Rio Grande Gorge)\n- Chaco Culture National Historic Park\n- Gila Cliff Dwellings\n- Roswell (UFO tourism)\n- City of Rocks State Park\n- Bosque del Apache (bird migration)\n- El Malpais National Monument\n- Bisti Badlands\n- Meow Wolf (Santa Fe - indoor!)\n- Faywood Hot Springs area\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 11,
    "name": "Colorado Rockies",
    "region": "Colorado",
    "drive_time": "10-14 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Colorado. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option. Note altitude considerations for young kids.\n\nDestinations to consider (pick the best 10-15):\n- Rocky Mountain National Park (ONE campground)\n- Mesa Verde National Park (cliff dwellings!)\n- Great Sand Dunes National Park\n- Black Canyon of the Gunnison\n- Garden of the Gods\n- Pikes Peak area\n- Durango (train to Silverton)\n- Glenwood Springs (hot springs, caves)\n- Colorado National Monument\n- Dinosaur National Monument\n- Maroon Bells area\n- Telluride / Ouray (Million Dollar Highway)\n- Royal Gorge\n- Florissant Fossil Beds\n- Grand Lake / Shadow Mountain\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics (including altitude!), pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  },
  {
    "id": 12,
    "name": "Big Bend & West Texas",
    "region": "Big Bend/West Texas",
    "drive_time": "12-14 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Big Bend and West Texas. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.\n\nIMPORTANT: Each location should be a DIFFERENT PLACE TO VISIT. For each, recommend ONE best camping option.\n\nDestinations to consider (pick the best 10-15):\n- Big Bend National Park (ONE campground)\n- Big Bend Ranch State Park\n- Guadalupe Mountains National Park\n- Marfa (art, Prada Marfa, mystery lights)\n- Terlingua ghost town\n- Fort Davis / Davis Mountains\n- McDonald Observatory\n- Balmorhea State Park (spring-fed pool!)\n- Hueco Tanks State Park\n- Seminole Canyon State Park (pictographs)\n- Langtry / Judge Roy Bean\n- Santa Elena Canyon\n- Chinati Hot Springs\n- Franklin Mountains State Park\n- Palo Duro Canyon (if in range)\n\nFor each destination provide: ONE recommended camping spot with full address, website, hook explaining why THIS PLACE is worth visiting, 5-10 activities with AllTrails URLs for hikes, kid engagement per child, RV logistics, pros/cons.\n\nReturn 10-15 distinct destinations as JSON."
  }
]'::jsonb
WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271';

-- Also insert if not exists
INSERT INTO rv_research_settings (user_id, research_prompts)
SELECT
  'b201a860-05a3-4ddc-bb89-4c4271177271',
  '[
  {
    "id": 1,
    "name": "Southern California Desert Region",
    "region": "Southern California & Deserts",
    "drive_time": "2-4 hours from LA",
    "target": "10-15 distinct destinations",
    "prompt": "Research 10-15 DISTINCT DESTINATIONS in Southern California desert regions..."
  }
]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM rv_research_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271'
);
