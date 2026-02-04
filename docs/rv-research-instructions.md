# RV Location Research Instructions for Claude

## Your Role

You are researching RV camping destinations for the Oberlander family's travel planning. Your goal is to find destinations that are genuinely worth the drive time from Los Angeles, providing specific, actionable information that helps the family decide where to go and what to do there.

**Critical Mindset:** Every destination must answer: "Why drive X hours to stay HERE instead of somewhere closer?" If a location doesn't have a compelling answer, it shouldn't be recommended.

---

## Family Context

### The Family

- **Richard (39)** - History and geology enthusiast, landscape photographer. Loves understanding why places look the way they do. Enjoys challenging hikes but will sacrifice distance for a great view. Wants to learn the stories behind locations.

- **Chi (42)** - Relaxation-focused, appreciates comfort and beauty. Enjoys wine country, spa experiences, and peaceful settings. Prefers activities that don't require extreme exertion but loves scenic views and unique experiences.

- **Parker (8)** - Challenge-seeker and competitive. Loves climbing, hiking difficult trails, and conquering obstacles. Needs activities with clear goals or achievements. Gets bored with "walking around" - needs purpose and challenge.

- **Charlotte (5)** - Explorer and collector. Loves tide pools, finding treasures, examining tiny things. Enjoys nature walks when there are things to discover. Good stamina but needs engagement. Loves animals and learning their names.

- **Xander (3)** - Animals and sensory play. Loves wildlife viewing (could watch squirrels for hours), sand, water, digging. Needs contained exploration areas. Likes beaches, playgrounds, and any place with animals to spot.

### Equipment

- **RV:** 30-foot Reflection 260 5th wheel (can fit up to 100ft sites)
- **Tow Vehicle:** Toyota Tundra
- **Connectivity:** Starlink for internet
- **Gear:** Bikes for the whole family, paddleboard, kayak
- **Base Location:** Los Angeles area

### Travel Style

- Prefer quality over quantity - would rather do 2-3 amazing activities than rush through 10 mediocre ones
- Kids need variety - can't do 3 hikes in a row, need to mix activity types
- Xander has limited hiking range (~1 mile max without carrier)
- Early mornings work well for activities before it gets hot
- Evening activities near camp are ideal (stargazing, sunset viewing, campfires)
- Willing to drive 8+ hours for exceptional destinations, but closer options preferred for weekends

---

## Required Information for Each Location

### Essential (Must Have)

1. **Name** - Official name of the campground or area
2. **Full Address** - Complete street address (e.g., "14500 Lower Kern Canyon Rd, California Hot Springs, CA 93207"). **CRITICAL for Google enrichment matching.**
3. **Website** - Official website URL. **CRITICAL for verification and Google matching.**
4. **Phone** - Contact phone number
5. **Hook** - 1-2 sentences explaining WHY this place is special. What makes it worth the drive? This should be compelling and specific, not generic ("beautiful scenery").
6. **Description** - 3-5 sentences describing the overall experience
7. **Category** - One of: `national_parks`, `state_parks`, `hot_springs`, `lake_river`, `boondocking`, `harvest_hosts`, `couples_getaway`, `other`
8. **City, State** - City and state for location grouping
9. **Drive Time from LA** - Approximate drive time
10. **Best Season** - Which months are ideal, which to avoid, and why

**Why Address & Website Matter:** The enrichment process uses Google Places API to fetch ratings, reviews, and photos. Without a precise address, Google may return the wrong location (e.g., a different "California Hot Springs" in another state). The address ensures we match the exact property.

### RV Logistics (Critical for Planning)

- **Max Trailer Length** - What's the longest rig that fits? (Our 5th wheel is 30ft)
- **Hookups** - `full`, `water_electric`, `electric_only`, `dry`, or `none`
- **Cell Coverage** - `excellent`, `good`, `spotty`, or `none`
- **Road Accessibility** - Any concerns for a 5th wheel (steep grades, tight turns, unpaved roads)?
- **Fifth Wheel Accessible** - Explicitly confirm if 5th wheels can access the sites
- **Reservation Notes** - How far ahead to book? Recreation.gov? First-come-first-served?

### Vibe Ratings (1-5 Scale)

- **Solitude Level** - 1 = crowded/busy, 5 = isolated/private
- **Relaxation Factor** - 1 = constant activity required, 5 = pure relaxation
- **Scenic Beauty** - 1 = unremarkable, 5 = breathtaking
- **Adventure Level** - 1 = mellow/chill, 5 = extreme adventure
- **Family Friendly** - 1 = adults only vibe, 5 = perfect for young kids

### Kid Engagement

For each child (Parker, Charlotte, Xander), provide:
- **Suitable** - Is this destination appropriate for them?
- **Engagement Level** - 1-5 rating of how much they'll love it
- **Activities** - List 3-5 specific activities tailored to their interests

### Cost & Practical

- **Cost Per Night** - Approximate cost for campsite
- **Reservation Required** - Yes/No and any notes
- **Educational Value** - Visitor center? Junior Ranger program? Learning opportunities?

### Lists

- **Pros** - 3-5 bullet points of what makes this place great
- **Cons** - 2-3 honest concerns or limitations
- **Tags** - Keywords for searching (e.g., `full-hookups`, `stargazing`, `swimming`, `hot-springs`)

---

## Activities Research

For each location, research 5-10 specific activities. Not generic ("go hiking") but specific ("Mesquite Flat Sand Dunes at sunset - 2 hours of sandboarding and photography").

### Activity Details Required

1. **Name** - Specific activity name (trail name, beach name, specific attraction)
2. **Type** - One of: `hike`, `bike`, `swim`, `fish`, `kayak`, `paddleboard`, `horseback`, `wildlife_viewing`, `stargazing`, `hot_springs`, `beach`, `playground`, `visitor_center`, `ranger_program`, `scenic_drive`, `photography`, `other`
3. **Description** - What you'll do and why it's worth doing
4. **Duration** - How long to budget (e.g., "2-3 hours")
5. **Difficulty** - For hikes: Easy/Moderate/Difficult + specifics

### For Hiking Trails (REQUIRED Fields)

Every hike activity **MUST** include these fields:

| Field | Required | Description |
|-------|----------|-------------|
| `alltrails_url` | **REQUIRED** | Full AllTrails URL for the trail |
| `distance_miles` | **REQUIRED** | Trail distance in miles |
| `elevation_gain_ft` | **REQUIRED** | Total elevation gain in feet |
| `difficulty` | **REQUIRED** | Easy/Moderate/Difficult |
| `trail_surface` | Recommended | Paved, sandy, rocky, etc. |
| `kid_appropriateness` | Recommended | Per-child notes (e.g., "Charlotte can do this, but Xander will need the carrier after mile 0.5") |

**Why AllTrails is Required:** AllTrails URLs provide trail maps, recent condition reports, and user photos that help families decide if a trail is appropriate. Without this URL, the family cannot verify trail conditions before visiting.

### AllTrails Research Guidance

For every hike activity, you MUST:

1. **Find the trail on AllTrails:**
   - Go to [alltrails.com](https://www.alltrails.com)
   - Search for the trail name + location (e.g., "Golden Canyon Trail Death Valley")
   - Verify the trail is actually near the campground being researched

2. **Copy the full URL:**
   - Use the complete URL (e.g., `https://www.alltrails.com/trail/us/california/golden-canyon-trail`)
   - Do NOT use shortened URLs or mobile URLs

3. **Verify distance and elevation:**
   - Use AllTrails' stated distance and elevation gain
   - If multiple sources conflict, note the discrepancy in the tips field

4. **Check recent reviews:**
   - Look at recent reviews for current trail conditions
   - Note any seasonal closures or hazards in the tips field

**Example AllTrails URL format:**
```
https://www.alltrails.com/trail/us/[state]/[trail-name-slug]
```

### For Each Activity

- **Kid Engagement** per child (suitable, engagement level, why)
- **Tips** - Timing, what to bring, insider knowledge

---

## Quality Checklist

Before submitting research, verify:

- [ ] **Compelling Hook** - Would someone read this and immediately want to go?
- [ ] **Specific Activities** - Not just "hiking trails nearby" but actual trail names with distances
- [ ] **RV Logistics Verified** - Confirmed the site can handle a 30ft 5th wheel
- [ ] **Kid Engagement Detailed** - Specific activities per child, not generic "kids will like it"
- [ ] **Honest Cons** - Every place has downsides - what are they?
- [ ] **Vibe Ratings Thoughtful** - Based on actual research, not assumptions
- [ ] **Seasonal Accuracy** - Best times based on weather, crowds, and accessibility

---

## JSON Output Format

Output your research as JSON matching this exact structure:

```json
{
  "locations": [
    {
      "name": "Furnace Creek Campground",
      "address": "190 Highway 190, Death Valley, CA 92328",
      "website": "https://www.nps.gov/deva/planyourvisit/furnace-creek-campground.htm",
      "phone": "(760) 786-3200",
      "hook": "The hottest, driest, lowest point in North America—where Star Wars was filmed and 2-billion-year geology tells Earth's story.",
      "description": "Furnace Creek offers the rare combination of full RV hookups inside a national park. Camp at 190 feet below sea level surrounded by rainbow-colored mountains, salt flats that stretch to the horizon, and some of the darkest skies in California.",
      "category": "national_parks",
      "state": "CA",
      "city": "Death Valley",
      "drive_time_from_la": "4-5 hours",

      "rv_logistics": {
        "max_trailer_length_ft": 100,
        "hookups": "full",
        "cell_coverage": "good",
        "road_accessibility": "Paved highway all the way, easy for 5th wheels",
        "fifth_wheel_accessible": true
      },

      "vibe": {
        "solitude_level": 3,
        "relaxation_factor": 3,
        "scenic_beauty": 5,
        "adventure_level": 4,
        "family_friendly": 4
      },

      "best_season": {
        "best": ["october", "november", "december", "january", "february", "march"],
        "avoid": ["june", "july", "august"],
        "notes": "Summer temperatures exceed 120°F - dangerous for outdoor activities"
      },

      "cost_per_night": 55,
      "reservation_required": true,
      "reservation_notes": "Book via recreation.gov 6 months ahead for peak season",

      "kid_engagement": {
        "parker": {
          "suitable": true,
          "engagement_level": 5,
          "activities": [
            "Golden Canyon hike to Red Cathedral",
            "Badwater Basin salt flats exploration",
            "Star Wars filming locations tour"
          ]
        },
        "charlotte": {
          "suitable": true,
          "engagement_level": 4,
          "activities": [
            "Sand dunes sunset play at Mesquite Flat",
            "Junior Ranger program",
            "Borax museum crystals"
          ]
        },
        "xander": {
          "suitable": true,
          "engagement_level": 3,
          "activities": [
            "Mesquite Flat Dunes sandbox play",
            "Swimming pool at resort",
            "Coyote and roadrunner watching"
          ]
        }
      },

      "educational_value": {
        "visitor_center": true,
        "junior_ranger_program": true,
        "topics": ["geology", "mining history", "desert ecology", "astronomy"]
      },

      "pros": [
        "Full hookups rare in national parks",
        "Iconic, otherworldly landscapes",
        "Excellent dark sky stargazing",
        "World-record geology accessible to kids"
      ],
      "cons": [
        "Extreme heat limits season to winter months",
        "Expensive fuel inside park",
        "Limited shade for midday activities"
      ],
      "tags": ["national-park", "full-hookups", "stargazing", "geology", "star-wars", "dark-sky"],

      "activities": [
        {
          "name": "Mesquite Flat Sand Dunes at Sunset",
          "activity_type": "hike",
          "alltrails_url": "https://www.alltrails.com/trail/us/california/mesquite-flat-sand-dunes",
          "description": "Sandboarding and photography at golden hour. No permits required, no marked trails - just endless dunes to explore.",
          "duration_text": "2-3 hours",
          "difficulty": "easy",
          "distance_miles": 1.5,
          "elevation_gain_ft": 100,
          "kid_engagement": {
            "parker": {
              "suitable": true,
              "engagement_level": 5,
              "activities": ["Running up dunes", "Sandboarding", "Finding highest dune"]
            },
            "charlotte": {
              "suitable": true,
              "engagement_level": 5,
              "activities": ["Sand play", "Finding animal tracks", "Sunset colors"]
            },
            "xander": {
              "suitable": true,
              "engagement_level": 5,
              "activities": ["Digging in sand", "Running down dunes", "Sensory play"]
            }
          },
          "tips": "Arrive 2 hours before sunset for best light. Bring sand toys, remove shoes. Park at Stovepipe Wells lot."
        },
        {
          "name": "Golden Canyon to Red Cathedral",
          "activity_type": "hike",
          "alltrails_url": "https://www.alltrails.com/trail/us/california/golden-canyon-to-red-cathedral-trail",
          "description": "Walk through technicolor canyon walls to a natural amphitheater of red cliffs.",
          "duration_text": "2-3 hours",
          "difficulty": "moderate",
          "distance_miles": 3,
          "elevation_gain_ft": 400,
          "kid_engagement": {
            "parker": {
              "suitable": true,
              "engagement_level": 5,
              "activities": ["Canyon scrambling", "Rock formations", "Reaching the cathedral"]
            },
            "charlotte": {
              "suitable": true,
              "engagement_level": 4,
              "activities": ["Colorful rocks", "Canyon exploring", "Photo ops"]
            },
            "xander": {
              "suitable": false,
              "engagement_level": 2,
              "activities": ["Too long - bring carrier or skip"]
            }
          },
          "tips": "Start early morning to avoid heat. Bring extra water. The colors are best in morning light."
        }
      ]
    }
  ]
}
```

---

## Category-Specific Guidance

### National Parks
- Focus on signature experiences (what makes this park unique)
- Note Junior Ranger programs and visitor center quality
- Research specific viewpoints and their accessibility
- Include any permit requirements

### Hot Springs
- Water temperature and soak areas
- Developed vs primitive springs
- Clothing optional status
- Best time of day to visit

### Lake/River
- Swimming accessibility
- Kayak/paddleboard launch points
- Fishing regulations and what's catchable
- Water temperature by season

### Boondocking
- BLM vs National Forest land
- Nearest services (dump station, water, groceries)
- Generator hours and quiet time expectations
- Cell coverage reality (test with reliable sources)

### Couples Getaway
- Babysitting/kids club options nearby
- Fine dining within 30 minutes
- Spa services
- Adults-only activities

---

## Research Sources to Consult

1. **Campendium** - Real reviews from RVers with site-specific info
2. **Recreation.gov** - Official site limits and reservation windows
3. **AllTrails** - Trail details, recent conditions, photos
4. **iOverlander** - Boondocking spots with cell coverage reports
5. **Google Maps Reviews** - Current condition reports
6. **Park Official Websites** - Hours, fees, alerts
7. **Facebook Groups** - "Death Valley Camping" etc. for current conditions

---

## Output Instructions

1. Research thoroughly before writing - verify claims with multiple sources
2. Output valid JSON only - no markdown code blocks, no explanatory text
3. Use exact field names as shown in the template
4. Include all required fields - don't skip sections
5. Be honest about limitations - every place has cons
6. Be specific - not "nice hike" but "3.2 miles, 800ft gain, stunning views of the canyon from mile 2"

---

## Initial Research vs Enrichment

Understanding what data comes from where helps ensure thorough research.

### Initial Research (Claude)

This is what YOU should research and provide when creating a location:

| Field | Description | Example |
|-------|-------------|---------|
| **Full Address** | Complete street address - CRITICAL for Google matching | "14500 Lower Kern Canyon Rd, California Hot Springs, CA 93207" |
| **Website** | Official website URL - CRITICAL for verification | "https://www.californiahotsprings.com" |
| **Phone** | Contact phone number | "(661) 548-6582" |
| **Hook** | Compelling 1-2 sentence reason to visit | "The only place in the US where you can hike to a slot canyon, swim in natural pools, and camp under Dark Sky-certified skies" |
| **Description** | 3-5 sentences about the overall experience | Full paragraph describing what makes this place special |
| **Specific Named Activities** | Real trail names, not generic activities | "Mesquite Flat Sand Dunes at Sunset" not "hiking" |
| **Activity Details** | Distance, elevation, time, tips | 1.5 mi, 100 ft gain, arrive 2hr before sunset |
| **Kid Engagement** | Per-child breakdown with specific activities | Parker: 5/5 - Golden Canyon scrambling, reaching the cathedral |
| **Educational Value** | Visitor center, junior ranger, ranger programs, learning topics | visitor_center: true, topics: ["geology", "desert ecology"] |
| **Vibe Ratings** | 1-5 scale for scenic beauty, solitude, relaxation, adventure, family-friendly | All five ratings with thought behind each |
| **RV Logistics** | Max length, hookups, cell coverage, road access | 100ft max, full hookups, good cell, paved roads |
| **Pros/Cons** | Honest assessment (3-5 pros, 2-3 cons) | Pros: Dark skies, full hookups in park. Cons: Extreme summer heat |
| **Best Season** | Best months, avoid months, why | Best: Oct-Mar, Avoid: Jun-Aug, summer exceeds 120°F |

### Enrichment (Google API)

This data is added LATER via the "Enrich" button and should NOT be researched manually:

| Field | Source |
|-------|--------|
| Google ratings/reviews | Google Places API |
| Google photos | Google Places API |
| Opening hours | Google Places API |
| Google Maps URLs | Google Places API |
| Coordinates (lat/lng) | Google Places API |
| Review summaries | AI-generated from Google reviews |
| Activity Google ratings | Google Places API per activity |

**Key Point:** Don't leave sections empty expecting enrichment to fill them. Enrichment only adds Google-specific data. You must provide the educational value, kid engagement, vibe ratings, pros/cons, and detailed activity information.

---

## Quality Bar Examples

### Activity Research

**BAD - Too Generic:**
```json
{
  "name": "Hiking",
  "activity_type": "hike",
  "description": "Nice hiking trails nearby"
}
```

**BAD - Missing Details:**
```json
{
  "name": "Mesquite Flat Sand Dunes",
  "activity_type": "hike"
}
```

**BAD - Hike Missing REQUIRED Fields:**
```json
{
  "name": "Golden Canyon Trail",
  "activity_type": "hike",
  "description": "Nice hike through the canyon with colorful rock formations.",
  "difficulty": "moderate"
}
```
❌ **Why this is BAD:** Missing `alltrails_url`, `distance_miles`, and `elevation_gain_ft` - ALL are REQUIRED for hike activities.

**GOOD - Hike with All Required Fields:**
```json
{
  "name": "Golden Canyon to Red Cathedral",
  "activity_type": "hike",
  "alltrails_url": "https://www.alltrails.com/trail/us/california/golden-canyon-to-red-cathedral-trail",
  "description": "Walk through technicolor canyon walls to a natural amphitheater of red cliffs.",
  "duration_text": "2-3 hours",
  "difficulty": "moderate",
  "distance_miles": 3.0,
  "elevation_gain_ft": 400,
  "tips": "Start early morning to avoid heat. Bring extra water. The colors are best in morning light."
}
```
✅ **Why this is GOOD:** Includes AllTrails URL, distance, and elevation - all REQUIRED fields for hikes.

**GOOD - Specific and Complete (with kid engagement):**
```json
{
  "name": "Mesquite Flat Sand Dunes at Sunset",
  "activity_type": "hike",
  "alltrails_url": "https://www.alltrails.com/trail/us/california/mesquite-flat-sand-dunes",
  "description": "Sandboarding and photography at golden hour. No permits required, no marked trails - just endless dunes to explore.",
  "duration_text": "2-3 hours",
  "difficulty": "easy",
  "distance_miles": 1.5,
  "elevation_gain_ft": 100,
  "time_of_day": "evening",
  "tips": "Arrive 2 hours before sunset for best light. Bring sand toys, remove shoes. Park at Stovepipe Wells lot.",
  "kid_engagement": {
    "parker": {
      "suitable": true,
      "engagement_level": "high",
      "activities": ["Running up dunes", "Sandboarding", "Finding highest dune"]
    },
    "charlotte": {
      "suitable": true,
      "engagement_level": "high",
      "activities": ["Sand play", "Finding animal tracks", "Sunset colors"]
    },
    "xander": {
      "suitable": true,
      "engagement_level": "high",
      "activities": ["Digging in sand", "Running down dunes", "Sensory play"]
    }
  }
}
```

### Kid Engagement Research

**BAD:**
```json
{
  "kid_engagement": {
    "parker": { "suitable": true },
    "charlotte": { "suitable": true },
    "xander": { "suitable": true }
  }
}
```

**GOOD:**
```json
{
  "kid_engagement": {
    "parker": {
      "suitable": true,
      "engagement_level": "high",
      "activities": [
        "Golden Canyon hike to Red Cathedral",
        "Badwater Basin salt flats exploration",
        "Star Wars filming locations tour"
      ],
      "notes": "Will love the challenge of reaching Red Cathedral and the otherworldly landscapes"
    },
    "charlotte": {
      "suitable": true,
      "engagement_level": "high",
      "activities": [
        "Sand dunes sunset play at Mesquite Flat",
        "Junior Ranger program",
        "Borax museum crystal exhibits"
      ],
      "notes": "The Junior Ranger program here is excellent with hands-on geology activities"
    },
    "xander": {
      "suitable": true,
      "engagement_level": "medium",
      "activities": [
        "Mesquite Flat Dunes sandbox play",
        "Swimming pool at resort",
        "Coyote and roadrunner watching"
      ],
      "notes": "Limited to morning activities due to heat. The sand dunes are perfect for sensory play."
    }
  }
}
```

### Educational Value Research

**BAD:**
```json
{
  "educational_value": {
    "visitor_center": true
  }
}
```

**GOOD:**
```json
{
  "educational_value": {
    "visitor_center": true,
    "junior_ranger_program": true,
    "ranger_programs": true,
    "topics": ["geology", "mining history", "desert ecology", "astronomy", "indigenous history"]
  }
}
```

---

## Checklist Before Submitting

Before marking research complete, verify ALL of these:

### Location Essentials
- [ ] **Full address** is provided (street, city, state, zip) - CRITICAL for Google matching
- [ ] **Website URL** is provided - CRITICAL for verification
- [ ] **Phone number** is provided
- [ ] Hook is compelling and specific (not "beautiful scenery")

### Activities (REQUIRED)
- [ ] 5-10 specific, named activities (not "hiking" or "swimming")
- [ ] Each activity has: duration, difficulty, tips
- [ ] Each activity has kid_engagement for all 3 kids

### Hike Activities (ALL REQUIRED for every hike)
- [ ] ✅ Every hike activity has an **AllTrails URL** (`alltrails_url`)
- [ ] ✅ Every hike activity has **distance in miles** (`distance_miles`)
- [ ] ✅ Every hike activity has **elevation gain in feet** (`elevation_gain_ft`)
- [ ] AllTrails URLs have been verified (trail exists and matches location)

### Kid Engagement & Education
- [ ] Location has kid_engagement for all 3 kids with specific activities
- [ ] Educational value section is complete (visitor_center, junior_ranger_program, topics)

### Vibe & Logistics
- [ ] All 5 vibe ratings are provided with thought
- [ ] RV logistics are complete (max length, hookups, cell, road access)
- [ ] Pros (3-5) and Cons (2-3) are honest and specific
- [ ] Best season includes best months, avoid months, and why

---

## Research Prompts

The user can say "do prompt 1" or "do prompt 8" to trigger a specific regional research task. Here are the available prompts:

### Prompt 1: Southern California Desert Region
**Region:** Southern California & Deserts | **Drive:** 2-4 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Southern California's desert regions within 2-4 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 2: Southern California Coastal & Mountains
**Region:** Southern California Coast/Mountains | **Drive:** 2-4 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS along the Southern California coast and mountains within 2-4 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, paddleboard, and bikes.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 3: Central California - Sequoias to Coast
**Region:** Central California | **Drive:** 4-6 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Central California within 4-6 hours of Los Angeles. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 4: Eastern Sierra - Bishop to Tahoe
**Region:** Eastern Sierra | **Drive:** 4-8 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in the Eastern Sierra from Bishop to Lake Tahoe. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, and paddleboard.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 5: Death Valley & Nevada
**Region:** Death Valley/Nevada | **Drive:** 4-7 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Death Valley and Nevada. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 6: Arizona - Sedona to Grand Canyon
**Region:** Northern Arizona | **Drive:** 5-8 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Northern Arizona. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 7: Arizona - Southern Desert
**Region:** Southern Arizona | **Drive:** 5-7 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Southern Arizona. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 8: Utah - National Parks & Beyond
**Region:** Utah | **Drive:** 6-10 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS across Utah. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 9: Oregon - Crater Lake to Coast
**Region:** Oregon | **Drive:** 10-14 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Oregon. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel, kayak, and paddleboard.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 10: New Mexico - Land of Enchantment
**Region:** New Mexico | **Drive:** 8-12 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS across New Mexico. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 11: Colorado Rockies
**Region:** Colorado | **Drive:** 10-14 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Colorado. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

### Prompt 12: Big Bend & West Texas
**Region:** Big Bend/West Texas | **Drive:** 12-14 hours from LA | **Target:** 10-15 distinct destinations

Research 10-15 DISTINCT DESTINATIONS in Big Bend and West Texas. Family with kids ages 3, 5, and 8. We have a 30ft 5th wheel.

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

Return 10-15 distinct destinations as JSON.

---

## Quick Reference

| Prompt | Region | Drive Time |
|--------|--------|------------|
| 1 | SoCal Deserts | 2-4 hours |
| 2 | SoCal Coast/Mountains | 2-4 hours |
| 3 | Central California | 4-6 hours |
| 4 | Eastern Sierra | 4-8 hours |
| 5 | Death Valley/Nevada | 4-7 hours |
| 6 | Arizona North | 5-8 hours |
| 7 | Arizona South | 5-7 hours |
| 8 | Utah | 6-10 hours |
| 9 | Oregon | 10-14 hours |
| 10 | New Mexico | 8-12 hours |
| 11 | Colorado | 10-14 hours |
| 12 | Big Bend/Texas | 12-14 hours |

When the user says "do prompt X", execute that prompt using the research instructions above and return the results as JSON.
