-- Migration: Seed default travel guide templates
-- Populates template definitions with default content from hardcoded functions

-- =====================================================
-- FIRST: Add phase 0 to phases table (needed for FK constraint)
-- =====================================================
INSERT INTO travel_guide_phases (phase_number, name, description, color, icon, claude_project_name, claude_project_description, sort_order)
VALUES (0, 'Shared Resources', 'Used by all phases', 'gray', 'folder', NULL, 'Upload to each Claude Project', 0);

-- =====================================================
-- PHASE 0: Shared Resources (Family Profile)
-- =====================================================
INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(0, 'family-profile', 'Family Travel Profile', 'family-profile.json', 'json', true,
 'Shared family information for all phases - uploaded to each Claude Project',
 $TEMPLATE${
  "family_name": "Your Family",
  "travelers": [
    {
      "name": "Parent 1",
      "role": "parent",
      "age_at_trip": 35,
      "interests": ["photography", "history"],
      "dietary": [],
      "notes": ""
    },
    {
      "name": "Parent 2",
      "role": "parent",
      "age_at_trip": 33,
      "interests": ["food", "relaxation"],
      "dietary": [],
      "notes": ""
    },
    {
      "name": "Child 1",
      "role": "child",
      "age_at_trip": 7,
      "interests": ["animals", "swimming"],
      "dietary": [],
      "notes": ""
    }
  ],
  "travel_style": {
    "pace": "moderate",
    "accommodation_preference": "quality over quantity",
    "dining_style": "mix of local spots and nice restaurants",
    "activity_level": "moderate with rest days"
  },
  "logistics": {
    "home_airport": "LAX",
    "car_seats_needed": 1,
    "stroller_needed": false
  },
  "preferences": {
    "must_haves": ["pool access", "kid-friendly activities"],
    "avoid": ["long drives without breaks", "overly touristy spots"],
    "nice_to_haves": ["laundry access", "kitchen/kitchenette"]
  },
  "loyalty_programs": {
    "hotels": ["Marriott Bonvoy", "Hilton Honors"],
    "airlines": ["United MileagePlus"]
  }
}$TEMPLATE$,
 1);

-- =====================================================
-- PHASE 1: Trip Planning Templates
-- =====================================================

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(1, 'instructions', 'Instructions', 'instructions.md', 'markdown', true,
 'Instructions for the Trip Planner Claude Project',
 $TEMPLATE$# Trip Planner - Project Instructions

## Your Role
You are a travel planning assistant helping families plan multi-week trips. Your job is to have a conversation about their trip and output a trip-skeleton.json when finalized.

## Conversation Flow
1. **Discovery** - Ask about dates, must-sees, pace preferences, what they want to avoid
2. **Options** - Present 2-3 different itinerary approaches with trade-offs
3. **Refinement** - Adjust based on feedback
4. **Finalization** - Output trip-skeleton.json

## What You Consider
- Driving distances (max 3 hours/day with kids)
- Rest days every 4-5 days
- Don't front-load or back-load highlights
- Weather patterns by region
- Logistics (car rentals, flights, ferries)
- Don't cluster similar experiences (beach, beach, beach)

## Output Format
When finalized, output `trip-skeleton.json` with:
- Trip metadata (name, dates, traveler count, destination)
- Array of segment shells (name, dates, theme, key_experiences)
- Logistics summary
- NO detailed research - just structure

## Important
- Don't research specific restaurants/activities yet - that's Phase 3
- key_experiences are just anchors, not researched items
- Be opinionated but flexible
- Reference the family profile for context
- Think about the WHOLE trip - each segment affects others$TEMPLATE$,
 1);

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(1, 'skeleton-template', 'Skeleton Template', 'skeleton-template.json', 'json', false,
 'JSON schema for the trip skeleton output',
 $TEMPLATE${
  "trip": {
    "name": "Trip Name",
    "destination_country": "Country",
    "destination_country_code": "XX",
    "start_date": "2025-06-01",
    "end_date": "2025-06-30",
    "total_days": 30,
    "total_nights": 29,
    "traveler_count": 5,
    "status": "planning",
    "overview": "Brief trip overview describing the vision and highlights",
    "route_description": "Route summary: City A → City B → City C",
    "logistics": {
      "flights": { "outbound": "LAX → LIS", "return": "LIS → LAX" },
      "car_rental": { "pickup": "Lisbon Airport", "dropoff": "Lisbon Airport" }
    },
    "budget": { "estimated_total": "$X,XXX", "per_day": "$XXX" },
    "pacing_notes": "Notes about trip pacing and rest days"
  },
  "segments": [
    {
      "segment_number": 1,
      "name": "Segment Name",
      "region": "Region/Area",
      "start_date": "2025-06-01",
      "end_date": "2025-06-05",
      "nights": 4,
      "days": 5,
      "theme": "What this segment is about",
      "why_here": "Why this place matters for the trip",
      "key_experiences": ["Experience 1", "Experience 2", "Experience 3"],
      "location": {
        "location_name": "City Name",
        "country": "Country",
        "latitude": 0.0,
        "longitude": 0.0,
        "timezone": "Europe/Lisbon"
      },
      "accommodation": { "strategy": "Notes about where to stay" },
      "driving": { "from_previous": "2.5 hours from previous segment" },
      "priority": "high",
      "notes": "Any special notes for this segment"
    }
  ]
}$TEMPLATE$,
 2);

-- =====================================================
-- PHASE 2: Hotel Research Templates
-- =====================================================

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(2, 'instructions', 'Instructions', 'instructions.md', 'markdown', true,
 'Instructions for the Hotel Research Claude Project',
 $TEMPLATE$# Hotel Research Agent - Project Instructions

## Your Role
Research and score hotel options for a trip segment. Output structured JSON with 2-4 options per segment.

## Scoring Framework (100 points)
- **Luxury/Upgrade Potential** (30pts) - Suite availability, status benefits
- **Points Value** (20pts) - Cents per point, category bonuses
- **Location** (20pts) - Walkability, proximity to activities
- **Amenities** (15pts) - Pool, breakfast, parking, kid-friendly
- **Space** (15pts) - Room size, connecting rooms, kitchen

## What to Research
- Room categories and upgrade paths
- Points vs cash pricing (calculate CPP)
- Location relative to key sites (walking distance matters)
- Family-specific amenities (pool, breakfast, cribs)
- Recent reviews (last 6 months) - especially from families

## Output Format
Output `segment-N-hotels.json` with:
- metadata (trip, segment, dates, nights)
- hotels array with detailed scores and booking info
- summary with top recommendation and reasoning

## Pick Types
- BEST_OVERALL - Best balance of all factors
- BEST_VALUE - Best points redemption value
- BEST_LUXURY - Premium experience
- BEST_LOCATION - Ideal positioning$TEMPLATE$,
 1);

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(2, 'card-inventory', 'Card Inventory', 'card-inventory.json', 'json', true,
 'Credit cards, points balances, and elite status',
 $TEMPLATE${
  "_file_info": {
    "name": "Card Inventory",
    "version": "1.0",
    "description": "Credit cards, points balances, and elite status for hotel research"
  },
  "credit_cards": {
    "active": [
      {
        "card_name": "Chase Sapphire Reserve",
        "issuer": "Chase",
        "annual_fee": 550,
        "primary_use": "Travel, Dining (3x)",
        "hotel_benefits": [
          "Chase Travel Portal at 1.5 cpp",
          "Transfer to Hyatt 1:1",
          "Transfer to Marriott 1:1 (poor value)"
        ],
        "notes": "Primary travel card"
      }
    ],
    "recommended_to_add": [
      {
        "card_name": "Amex Platinum Personal",
        "why_recommended": "FHR access, Marriott Gold, Hilton Gold (free breakfast)"
      }
    ]
  },
  "points_balances": {
    "_note": "UPDATE THESE VALUES before each hotel research session",
    "chase_ultimate_rewards": {
      "balance": "UPDATE_ME",
      "transfer_partners_for_hotels": ["Hyatt 1:1 (best)", "Marriott 1:1 (poor)", "IHG 1:1 (ok)"],
      "portal_value": "1.5 cpp via CSR"
    },
    "marriott_bonvoy": { "balance": "UPDATE_ME" },
    "hyatt": { "balance": "UPDATE_ME" },
    "hilton_honors": { "balance": "UPDATE_ME" }
  },
  "elite_status": {
    "marriott_bonvoy": { "current_status": "Base Member" },
    "hyatt": { "current_status": "Base Member" },
    "hilton_honors": { "current_status": "Base Member" }
  },
  "booking_strategy_summary": {
    "priority_order": [
      "1. FHR for luxury properties - breakfast + credit + upgrade",
      "2. Hyatt via Chase UR transfer - best cpp value (1.7-2.0+ cpp)",
      "3. Hilton with Gold status - free breakfast adds significant value",
      "4. Chase Portal at 1.5 cpp - flexible, good for non-chain boutiques",
      "5. Cash - when points don't make sense"
    ]
  }
}$TEMPLATE$,
 2);

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(2, 'evaluation-framework', 'Evaluation Framework', 'evaluation-framework.json', 'json', true,
 'Scoring criteria and weights for comparing hotels',
 $TEMPLATE${
  "_file_info": {
    "name": "Hotel Evaluation Framework",
    "version": "1.0",
    "description": "Scoring criteria and weights for comparing hotel options",
    "key_priorities": [
      "Room upgrades and views are EXTREMELY important",
      "Absolutely do NOT want courtyard-facing rooms",
      "Pool is required but doesn't need to be fancy"
    ]
  },
  "evaluation_categories": {
    "loyalty_and_value": {
      "weight": 0.20,
      "description": "Points value, elite benefits, and redemption efficiency",
      "scoring": { "10": "2.0+ cpp or FHR with full benefits", "6": "1.3-1.7 cpp", "2": "<1.0 cpp" }
    },
    "luxury_and_upgrade_potential": {
      "weight": 0.30,
      "description": "THIS IS THE MOST IMPORTANT CATEGORY. Property tier and upgrade likelihood.",
      "scoring": { "10": "True luxury with high upgrade probability", "6": "Upscale, standard upgrades", "2": "Budget tier, no upgrades" }
    },
    "amenities_quality": {
      "weight": 0.15,
      "description": "Pool (REQUIRED), dining, facilities",
      "must_haves": ["Pool (non-negotiable)", "A/C"]
    },
    "location": {
      "weight": 0.20,
      "description": "Proximity to activities, neighborhood quality"
    },
    "space_and_comfort": {
      "weight": 0.15,
      "description": "Room size, sleeping configuration for 5"
    }
  },
  "pick_type_labels": [
    { "label": "BEST_OVERALL", "description": "Highest weighted score" },
    { "label": "BEST_VALUE", "description": "Best cpp or points efficiency" },
    { "label": "BEST_LUXURY", "description": "Highest luxury score" },
    { "label": "CASH_BACKUP", "description": "Best cash option if points don't work" }
  ],
  "cpp_reference": {
    "hyatt": { "poor": "<1.3", "average": "1.5-1.7", "good": "1.7-2.0", "excellent": "2.0+" },
    "marriott": { "poor": "<0.6", "average": "0.7-0.8", "good": "0.85-1.0", "excellent": "1.0+" },
    "hilton": { "poor": "<0.4", "average": "0.5", "good": "0.55-0.65", "excellent": "0.7+" }
  }
}$TEMPLATE$,
 3);

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(2, 'output-template', 'Output Template', 'output-template.json', 'json', false,
 'JSON schema for hotel research output',
 $TEMPLATE${
  "metadata": {
    "trip_name": "Trip Name",
    "segment_number": 1,
    "segment_name": "Segment Name",
    "dates": { "check_in": "2025-06-01", "check_out": "2025-06-05" },
    "nights": 4,
    "generated_at": "2025-01-01T00:00:00Z"
  },
  "segment_context": {
    "location": "City, Country",
    "key_activities": ["Activity 1", "Activity 2"],
    "priorities": ["Pool for kids", "Walking distance to old town"]
  },
  "hotels": [
    {
      "name": "Hotel Name",
      "pick_type": "BEST_OVERALL",
      "brand": "Brand Name",
      "loyalty_program": "Program Name",
      "category": "Category Level",
      "location": {
        "address": "Full address",
        "neighborhood": "Neighborhood name",
        "lat": 0.0,
        "lng": 0.0,
        "walking_to_center": "10 min"
      },
      "scores": {
        "overall_score": 8.5,
        "luxury_upgrade": 8,
        "points_value": 9,
        "location": 8,
        "amenities": 8,
        "space": 8
      },
      "pricing": {
        "points_per_night": 50000,
        "cash_per_night": 250,
        "total_points": 200000,
        "total_cash": 1000,
        "cpp": 0.5
      },
      "room_recommendation": "Room type recommendation",
      "upgrade_potential": "Notes about upgrade possibilities",
      "family_amenities": ["Pool", "Breakfast included", "Cribs available"],
      "why_recommended": "Detailed explanation of why this hotel",
      "booking_notes": "Any booking tips or warnings"
    }
  ],
  "summary": {
    "top_recommendation": {
      "hotel_name": "Hotel Name",
      "reason": "Why this is the top pick"
    },
    "alternatives_summary": "Brief on why you might choose alternatives"
  }
}$TEMPLATE$,
 4);

-- =====================================================
-- PHASE 3: Activity Research Templates
-- =====================================================

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(3, 'instructions', 'Instructions', 'instructions.md', 'markdown', true,
 'Instructions for the Activity Research Claude Project',
 $TEMPLATE$# Travel Research Agent - Project Instructions (v3)

## Your Role
Deep research for ONE segment at a time. Output COMPLETE content - no expansion phase.
The JSON you output will be imported directly into the database and displayed in the app.

**If you output summaries, the app shows summaries. Output full narratives = app shows full narratives.**

## Research Depth
- 50+ sources per segment
- Official sites, TripAdvisor, blogs, AllTrails, local food blogs
- Recent reviews (last 6-12 months)
- Cross-reference multiple sources for accuracy

## What You Output
`segment-N-research.json` with COMPLETE content:

### 1. city_info.deep_history (2000-4000 words)
Full narrative history, not bullet points. Written engagingly like a tour guide briefing.
Organized into titled sections, each explaining relevance to what they'll see.

### 2. days array with SPECIFIC times
"9:00-11:00am" not "morning". Include activity notes and tips.

### 3. deep_dive for must_do items (500-1000 words each)
- what_it_is: 1-2 sentence summary
- why_it_matters: 200-400 word narrative on significance
- the_story: 300-600 word origin/history story
- what_youll_see: Detailed highlights with descriptions
- interesting_facts: 5-10 fascinating details

### 4. kid_engagement with ACTUAL SCRIPTS
Real sentences to say to each child by age:
- "Count how many different things you can find carved in stone — ropes, anchors, shells"
- "Look at the ceiling! Does it look like trees growing up and spreading out?"
- "Can you find a stone lion? A stone elephant?"

## Item Types
restaurant, hike, attraction, beach, activity, viewpoint, neighborhood

## Priority Levels
- must_do: Essential, don't miss (8-10 per segment)
- recommended: Great if time allows (10-15 per segment)
- optional: Nice to have (5-8 per segment)$TEMPLATE$,
 1);

INSERT INTO travel_guide_template_definitions
(phase_number, template_key, display_name, filename, content_type, is_input, description, default_content, sort_order)
VALUES
(3, 'output-template', 'Output Template', 'output-template.json', 'json', false,
 'JSON schema for activity research output',
 $TEMPLATE${
  "metadata": {
    "trip_name": "Trip Name",
    "segment_number": 1,
    "segment_name": "Segment Name",
    "dates": { "start": "2025-06-01", "end": "2025-06-05" },
    "total_days": 5,
    "generated_at": "2025-01-01T00:00:00Z",
    "version": "3.0"
  },
  "segment": {
    "name": "Segment Name",
    "city_info": {
      "deep_history": {
        "sections": [
          { "title": "Section Title", "content": "2000-4000 words of narrative history...", "relevance": "Why this matters for their visit" }
        ]
      },
      "culture": { "summary": "Cultural context and tips" },
      "practical": { "best_time_to_visit": "", "weather": "", "local_tips": [] }
    },
    "packing_additions": ["Items specific to this segment"]
  },
  "research_items": [
    {
      "item_type": "attraction",
      "name": "Item Name",
      "category": "Category",
      "priority": "must_do",
      "why_relevant": "Why this matters for this family",
      "location": { "name": "", "address": "", "lat": 0, "lng": 0, "google_maps_url": "" },
      "practical": {
        "hours": "9am-6pm",
        "duration": "2-3 hours",
        "cost": "$XX per adult",
        "reservation_required": true,
        "booking_url": ""
      },
      "deep_dive": {
        "what_it_is": "1-2 sentence summary",
        "why_it_matters": { "content": "200-400 word narrative on significance" },
        "the_story": { "content": "300-600 word origin/history story" },
        "what_youll_see": [{ "area": "Area name", "highlights": ["Highlight 1", "Highlight 2"] }],
        "interesting_facts": ["Fact 1", "Fact 2"]
      },
      "kid_engagement": {
        "parker": { "age_at_trip": 7, "scripts": ["Script for 7-year-old"] },
        "charlotte": { "age_at_trip": 5, "scripts": ["Script for 5-year-old"] },
        "xander": { "age_at_trip": 3, "scripts": ["Script for 3-year-old"] }
      },
      "photo_spots": [{ "shot": "Shot description", "where": "Location", "when": "Best time" }],
      "tips": ["Tip 1", "Tip 2"]
    }
  ],
  "days": [
    {
      "day_number": 1,
      "date": "2025-06-01",
      "title": "Day Title",
      "theme": "Day theme",
      "schedule": [
        { "time": "9:00-11:00am", "activity_name": "Activity Name", "location": "Location", "notes": "Tips" }
      ],
      "meals": {
        "breakfast": { "recommendation": "", "notes": "" },
        "lunch": { "recommendation": "", "notes": "" },
        "dinner": { "recommendation": "", "notes": "" }
      }
    }
  ]
}$TEMPLATE$,
 2);
