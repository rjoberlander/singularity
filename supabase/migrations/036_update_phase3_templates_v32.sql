-- Migration: Update Phase 3 templates to V3.2 format
-- Includes: route_stops with for_travel_segment, alternatives with slot_type, downtime alternatives

-- Update Phase 3 Instructions
UPDATE travel_guide_template_definitions
SET default_content = $TEMPLATE$# Activity Research Agent - Project Instructions (V3.2)

## Your Role
Deep research agent for ONE segment at a time. Output COMPLETE JSON that imports directly into the app.

**CRITICAL: What you output = what shows in the app. No expansion phase. Full narratives required.**

---

## How User References Things

User will say things like:
- "Research segment 3" → Look up by segment_number
- "Research Sagres" → Look up by segment name
- Paste URL like `http://localhost:3000/travel/[trip-id]/details` → Extract trip_id from URL path

---

## Step 1: Get Context

### Run This Query First
Replace `[TRIP_ID]` with the UUID from the URL:
```sql
SELECT
  (SELECT family_profile FROM travel_settings WHERE user_id = 'b201a860-05a3-4ddc-bb89-4c4271177271') as family_profile,
  (SELECT jsonb_agg(jsonb_build_object(
    'segment_id', id,
    'segment_number', segment_number,
    'name', name,
    'location', location_name,
    'nights', nights,
    'start_date', start_date,
    'end_date', end_date,
    'theme', theme,
    'why_here', why_here,
    'key_experiences', key_experiences,
    'research_status', research_status
  ) ORDER BY segment_number) FROM trip_segments WHERE trip_id = '[TRIP_ID]') as segments
```

---

## Research Depth Requirements

- **50+ sources** per segment
- Official sites, TripAdvisor, AllTrails, local food blogs, recent travel articles
- **Recent reviews** (last 6-12 months)
- Cross-reference multiple sources for accuracy
- Verify opening hours, prices, and booking requirements

---

## Output Structure (V3.2)

### Metadata
```json
{
  "metadata": {
    "trip_name": "Trip Name",
    "segment_number": 3,
    "segment_name": "Sagres & Lagos",
    "dates": { "start": "2026-06-24", "end": "2026-06-26" },
    "total_days": 3,
    "nights": 2,
    "generated_at": "2026-01-25T00:00:00Z",
    "version": "3.2"
  }
}
```

---

## Schedule Slots (CRITICAL)

**Every schedule slot gets an ID and slot_type:**

```json
{
  "time": "1:30-3:30pm",
  "activity_name": "REST at accommodation",
  "activity_id": "day2-rest",
  "slot_type": "downtime",
  "notes": "Critical midday rest for Xander"
}
```

### Slot Types
| slot_type | Examples |
|-----------|----------|
| `activity` | Boat tour, fortress visit, beach time, hike |
| `downtime` | REST, NAP, Pool time, Hotel downtime |
| `meal` | Breakfast, lunch, dinner, snack stop |
| `travel` | Drive to X, Return to hotel, Depart for next segment |

### ID Naming Convention
- Format: `day{N}-{type}-{short-identifier}`
- Examples: `day1-activity-beach`, `day2-rest`, `day2-travel-cabo`, `day3-lunch`

---

## Route Stops (Side Detours)

Route stops are optional detours along driving routes. Link them to the specific travel activity:

```json
{
  "route_stops": [
    {
      "id": "route-fortaleza-beliche",
      "name": "Fortaleza de Beliche",
      "for_travel_segment": {
        "scheduled_activity_name": "Drive to Cabo de São Vicente",
        "scheduled_activity_id": "day2-travel-cabo",
        "slot_type": "travel"
      },
      "detour_time": "0 min (on route)",
      "visit_duration": "10-15 min",
      "reason": "Small clifftop fort, quick photo stop",
      "best_for": ["Parker", "photo opportunity"],
      "skip_if": "Running late for sunset",
      "location": {
        "name": "Fortaleza de Beliche",
        "lat": 37.0147,
        "lng": -8.9736,
        "google_maps_url": "https://maps.google.com/?q=..."
      },
      "tips": ["Just exterior/viewpoint", "Great cliff photos"]
    }
  ]
}
```

**Include route stops for:**
- Arrival route (from previous segment)
- Departure route (to next segment)
- Any scenic drives within the segment

---

## Alternatives

Two types of alternatives:

### Type 1: Direct Replacement (linked to specific activity)
```json
{
  "id": "alt-kayak-tour",
  "name": "Kayak Tour to Caves",
  "item_type": "activity",
  "replaces": {
    "scheduled_activity_name": "Ponta da Piedade Boat Tour",
    "scheduled_activity_id": "day2-activity-boat",
    "slot_type": "activity"
  },
  "trigger": "Want more active adventure; calm seas; family wants to split up",
  "why_not_scheduled": "Age minimum 5 excludes Xander. Would require splitting family.",
  "priority": "alternative",
  "practical": { ... },
  "deep_dive": { ... },
  "kid_engagement": { ... },
  "location": { ... }
}
```

### Type 2: General Alternative (not linked)
```json
{
  "id": "alt-lagos-zoo",
  "name": "Lagos Zoo",
  "item_type": "attraction",
  "replaces": null,
  "trigger": "Rainy day; very hot day; need indoor/shaded activity",
  "why_not_scheduled": "Limited time. Prioritized coastal experiences unique to region.",
  "priority": "alternative",
  ...
}
```

### Required Fields for Alternatives
| Field | Required | Description |
|-------|----------|-------------|
| `replaces` | Yes | Object with activity link, OR `null` for general |
| `trigger` | Yes | When would you choose this? Weather? Energy? |
| `why_not_scheduled` | Yes | **Critical** - why not in main schedule |
| `priority` | Yes | Always `"alternative"` |

---

## Downtime Alternatives (CRITICAL)

**Every REST, NAP, or POOL slot needs 1-2 alternatives:**

```json
{
  "id": "alt-day2-rest-dolphin",
  "name": "Dolphin Watching Catamaran",
  "item_type": "activity",
  "replaces": {
    "scheduled_activity_name": "REST at accommodation",
    "scheduled_activity_id": "day2-rest",
    "slot_type": "downtime"
  },
  "trigger": "Kids still energized; Xander napped in car; want to maximize time",
  "why_not_scheduled": "Midday rest usually critical for Xander (3). Use this slot if rest isn't needed.",
  "schedule_impact": "Skip Praia Dona Ana beach time; go directly to early dinner",
  "priority": "alternative",
  ...
}
```

### Good Triggers for Downtime Alternatives
- "Kids still have energy after morning activities"
- "Xander napped in car, doesn't need rest"
- "Weather turned—pool not appealing"
- "Running ahead of schedule"
- "Kids asking for more adventure"

---

## Research Items

### Content Depth Requirements

**deep_dive** (for must_do items):
```json
{
  "what_it_is": "1-2 sentence summary",
  "why_it_matters": "200-400 word narrative on significance",
  "the_story": "300-600 word origin/history",
  "what_youll_see": [{"area": "Cave Area", "highlights": ["highlight1", "highlight2"]}],
  "interesting_facts": ["fact1", "fact2", "fact3"]
}
```

**kid_engagement** - ACTUAL SCRIPTS by child name and age:
```json
{
  "parker": {
    "age_at_trip": 8,
    "scripts": [
      "These cliffs are 20 million years old—before dinosaurs!",
      "Watch for the rock that looks like an elephant drinking."
    ]
  },
  "charlotte": {
    "age_at_trip": 5,
    "scripts": [
      "We're going into secret mermaid caves!",
      "Look for rocks shaped like animals!"
    ]
  },
  "xander": {
    "age_at_trip": 3,
    "scripts": [
      "BOAT! We're going in the BOAT!",
      "Can you splash your hand in the water?"
    ]
  }
}
```

### Priority Levels
- **must_do**: Essential, don't miss (8-10 per segment)
- **recommended**: Great if time allows (10-15 per segment)
- **optional**: Nice to have (5-8 per segment)

### Item Types
`restaurant`, `hike`, `attraction`, `beach`, `activity`, `viewpoint`, `neighborhood`

---

## city_info Section

**deep_history** - 2000-4000 words in sections:
```json
{
  "deep_history": {
    "sections": [
      {
        "title": "The Sacred Promontory: Where the World Ended",
        "content": "Full narrative paragraph (500-800 words)...",
        "relevance": "Standing at Cabo de São Vicente, your family will experience..."
      }
    ]
  }
}
```

---

## Output Checklist

Before finalizing, verify:

- [ ] All schedule slots have `activity_id` and `slot_type`
- [ ] Route stops link to travel activities via `for_travel_segment`
- [ ] Every REST/NAP/POOL has 1-2 alternatives with `slot_type: "downtime"`
- [ ] Linked alternatives have `replaces` with full activity reference
- [ ] General alternatives have `replaces: null`
- [ ] All alternatives have `trigger` and `why_not_scheduled`
- [ ] deep_dive has 500-1000 words for must_do items
- [ ] kid_engagement has ACTUAL SCRIPTS (not "engage them")
- [ ] Version is "3.2"

---

## Import Location

Output JSON → Import at `http://localhost:3000/travel/[trip-id]/plan` → Select segment → Import$TEMPLATE$,
updated_at = NOW()
WHERE phase_number = 3 AND template_key = 'instructions';

-- Update Phase 3 Output Template
UPDATE travel_guide_template_definitions
SET default_content = $TEMPLATE${
  "metadata": {
    "trip_name": "Portugal Summer 2026",
    "segment_number": 3,
    "segment_name": "Sagres & Lagos",
    "dates": {
      "start": "2026-06-24",
      "end": "2026-06-26"
    },
    "total_days": 3,
    "nights": 2,
    "generated_at": "2026-01-25T00:00:00Z",
    "version": "3.2"
  },

  "segment": {
    "name": "Sagres & Lagos",
    "theme": "End of the world drama, sea caves, and Portugal's maritime frontier",
    "city_info": {
      "deep_history": {
        "sections": [
          {
            "title": "Section Title",
            "content": "500-800 word narrative...",
            "relevance": "Why this matters for their visit"
          }
        ]
      },
      "culture": {
        "summary": "Cultural context paragraph..."
      },
      "practical": {
        "best_time_to_visit": "June is ideal—warm but not oppressively hot",
        "weather": "Sunny, low humidity, can be windy",
        "local_tips": ["Tip 1", "Tip 2"]
      }
    },
    "packing_additions": ["Reef-safe sunscreen", "Water shoes"]
  },

  "research_items": [
    {
      "id": "unique-item-id",
      "item_type": "activity",
      "name": "Ponta da Piedade Boat Tour",
      "priority": "must_do",
      "scheduled_day": 2,
      "scheduled_time": "10:00-11:15am",
      "description": "Small boat tour through sea caves...",
      "practical": {
        "hours": "Tours depart 9am-6pm",
        "duration": "60-75 minutes",
        "cost": "€25/person",
        "age_minimum": "None",
        "reservation": "Required in June",
        "booking_url": "https://example.com"
      },
      "deep_dive": {
        "what_it_is": "1-2 sentence summary",
        "why_it_matters": "200-400 word narrative...",
        "the_story": "300-600 word history...",
        "what_youll_see": [
          {"area": "Sea Caves", "highlights": ["Cathedral Grotto", "Kitchen Cave"]}
        ],
        "interesting_facts": ["Fact 1", "Fact 2"]
      },
      "kid_engagement": {
        "parker": {
          "age_at_trip": 8,
          "scripts": ["These cliffs are 20 million years old!"]
        },
        "charlotte": {
          "age_at_trip": 5,
          "scripts": ["We're going into secret mermaid caves!"]
        },
        "xander": {
          "age_at_trip": 3,
          "scripts": ["BOAT! Look at the blue water!"]
        }
      },
      "location": {
        "name": "Lagos Marina",
        "lat": 37.0971,
        "lng": -8.6703,
        "google_maps_url": "https://maps.google.com/?q=37.0971,-8.6703"
      },
      "photo_spots": [
        {"shot": "Family inside cave", "where": "Cathedral Grotto", "when": "When boat pauses"}
      ],
      "tips": ["Sit in front of boat", "Bring sunscreen"]
    }
  ],

  "days": [
    {
      "day_number": 1,
      "date": "2026-06-24",
      "title": "Arrival & First Taste",
      "theme": "Settle in, easy beach time",
      "driving": {
        "from": "Previous segment",
        "to": "Lagos",
        "distance": "200 km",
        "duration": "2-2.5 hours"
      },
      "schedule": [
        {
          "time": "10:00am",
          "activity_name": "Depart previous segment",
          "activity_id": "day1-travel-depart",
          "slot_type": "travel",
          "notes": "2-2.5 hour drive"
        },
        {
          "time": "2:30-4:00pm",
          "activity_name": "REST/NAP",
          "activity_id": "day1-rest",
          "slot_type": "downtime",
          "notes": "Critical for Xander after travel"
        },
        {
          "time": "4:00-6:00pm",
          "activity_name": "Meia Praia Beach",
          "activity_id": "day1-activity-beach",
          "slot_type": "activity",
          "research_item_id": "sagres-meia-praia",
          "notes": "Calm water, easy access"
        }
      ],
      "meals": {
        "breakfast": {"recommendation": "At accommodation", "notes": ""},
        "lunch": {"recommendation": "Quick spot", "notes": ""},
        "dinner": {"recommendation": "Local restaurant", "notes": ""}
      }
    }
  ],

  "route_stops": [
    {
      "id": "route-stop-id",
      "name": "Fortaleza de Beliche",
      "for_travel_segment": {
        "scheduled_activity_name": "Drive to Cabo de São Vicente",
        "scheduled_activity_id": "day2-travel-cabo",
        "slot_type": "travel"
      },
      "detour_time": "0 min (on route)",
      "visit_duration": "10-15 min",
      "reason": "Small clifftop fort, quick photo stop",
      "best_for": ["Parker", "photo opportunity"],
      "skip_if": "Running late for sunset",
      "location": {
        "name": "Fortaleza de Beliche",
        "lat": 37.0147,
        "lng": -8.9736,
        "google_maps_url": "https://maps.google.com/?q=..."
      },
      "tips": ["Just exterior/viewpoint"]
    }
  ],

  "alternatives": [
    {
      "id": "alt-kayak-tour",
      "name": "Kayak Tour to Caves",
      "item_type": "activity",
      "replaces": {
        "scheduled_activity_name": "Ponta da Piedade Boat Tour",
        "scheduled_activity_id": "day2-activity-boat",
        "slot_type": "activity"
      },
      "trigger": "Want more active adventure; calm seas",
      "why_not_scheduled": "Age minimum 5 excludes Xander. Would require splitting family.",
      "priority": "alternative",
      "practical": {
        "duration": "2.5 hours",
        "cost": "€45-55/person",
        "age_minimum": "5 years"
      },
      "deep_dive": {
        "what_it_is": "Guided kayak tour into caves...",
        "why_it_matters": "More immersive experience..."
      },
      "kid_engagement": {
        "parker": {"age_at_trip": 8, "scripts": ["You're going to paddle into sea caves!"]},
        "charlotte": {"age_at_trip": 5, "scripts": ["You and Daddy paddle together!"]}
      },
      "location": {
        "name": "Batata Beach",
        "google_maps_url": "https://maps.google.com/?q=..."
      }
    },
    {
      "id": "alt-day1-rest-pool",
      "name": "Hotel Pool Time",
      "item_type": "activity",
      "replaces": {
        "scheduled_activity_name": "REST/NAP",
        "scheduled_activity_id": "day1-rest",
        "slot_type": "downtime"
      },
      "trigger": "Kids don't want to nap but need downtime; hotel has nice pool",
      "why_not_scheduled": "Full rest/nap is usually better recovery after travel.",
      "schedule_impact": "None—fits same time slot",
      "priority": "alternative",
      "practical": {
        "duration": "1-1.5 hours",
        "cost": "Free (hotel amenity)"
      }
    },
    {
      "id": "alt-lagos-zoo",
      "name": "Lagos Zoo",
      "item_type": "attraction",
      "replaces": null,
      "trigger": "Rainy day; very hot day; need indoor activity",
      "why_not_scheduled": "Limited time. Prioritized coastal experiences unique to region.",
      "priority": "alternative",
      "practical": {
        "hours": "10am-7pm",
        "duration": "3-4 hours",
        "cost": "Adult €16, Child €12"
      },
      "deep_dive": {
        "what_it_is": "Modern zoo with 150+ species...",
        "why_it_matters": "Guaranteed engagement for all kids..."
      },
      "kid_engagement": {
        "parker": {"age_at_trip": 8, "scripts": ["Let's see the lemur feeding!"]},
        "charlotte": {"age_at_trip": 5, "scripts": ["Penguins from AFRICA!"]},
        "xander": {"age_at_trip": 3, "scripts": ["ANIMALS! Pet the goats!"]}
      },
      "location": {
        "name": "Lagos Zoo",
        "lat": 37.1456,
        "lng": -8.7144,
        "google_maps_url": "https://maps.google.com/?q=Lagos+Zoo"
      }
    }
  ]
}$TEMPLATE$,
updated_at = NOW()
WHERE phase_number = 3 AND template_key = 'output-template';
