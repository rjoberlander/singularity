# PRD: Meal Research & Route-Aware Restaurant Planning

## Problem

Generic meal placeholders ("Dinner @ Hotel", "Lunch @ Pinhão") provide no value. The current enrichment pipeline uses Google Places text search which surfaces popular/touristy spots with no relationship to the day's actual route, activities, or regional food culture. Meals should be the most researched, opinionated part of the trip — not an afterthought.

## Goal

An independent, route-aware meal research system that:
- Produces a specific, researched restaurant for every breakfast, lunch, and dinner on every day
- Picks restaurants based on **where you'll actually be that day** (the day's activity locations)
- Prioritizes **authentic local food** over tourist traps
- Tells you **exactly what to order** at each place
- Operates independently of whatever's currently in the agenda — it uses its own research

## Core Principles

1. **Route-aware**: Each meal is placed geographically within that day's general area. If the day's activities are in Lagos old town, meals are in Lagos old town — not across town.
2. **Region-matched**: Restaurants are matched to the region's food identity. Alentejo = pork/bread/wine dishes. Algarve = cataplana/grilled fish. Douro = river fish/wine. Porto = francesinha/tripas.
3. **Research-backed**: Picks come from food blog recommendations, TripAdvisor/Yelp reviews with specific dish callouts, and regional specialty matching — not just Google star ratings.
4. **Independent**: The system does not depend on existing meal activity names or descriptions. It reads the day's activity schedule for location context only, then does its own research from scratch.
5. **Opinionated**: Each pick comes with "order THIS dish" — not just "go to this restaurant."

## Research Signals (Priority Order)

1. **Food blog recommendations** — Local food bloggers, Eater-style regional guides, "where locals actually eat" posts
2. **TripAdvisor/Yelp reviews with specific dish callouts** — What reviewers say to order, not just star ratings
3. **Regional specialty matching** — The restaurant should be known for dishes specific to that region
4. **Google rating + review count** — Baseline quality filter (4.0+ with 100+ reviews), but NOT the primary signal
5. **Proximity to the day's activity area** — Within the day's general zone, walkable preferred over driving

## Meal Types & Research Depth

| Meal | Format | Research Depth |
|------|--------|---------------|
| **Dinner** | Main event — sit-down restaurant | Full research: food blogs, reviews, specific dishes, reservation tips |
| **Lunch** | Casual/flexible — can be market, casual spot, tasca | Solid research: local recommendation, what to order, but lighter treatment than dinner |
| **Breakfast** | Cafe/pastelaria/bakery | Researched for local suggestions — best local café/pastelaria, what pastry or breakfast dish to try |

All three meals get researched. Dinner gets the deepest treatment. Breakfast and lunch are more casual but still specific and local.

## Key Principle: Plan Everything, Decide Later

The system **always plans breakfast, lunch, and dinner for every day** — regardless of whether the hotel includes breakfast or whether the traveler might skip a meal. The system's job is to research and provide the best local option for every slot. The traveler decides at trip time whether to use the plan or eat at the hotel instead.

- Do NOT skip breakfast research because "the hotel probably has breakfast"
- Do NOT skip meals on transition/checkout days
- Do NOT gate meal research on whether lodging is set — plan using whatever location data is available (segment location as fallback)
- Every day, every meal, every slot gets a researched restaurant pick

## Input Data (per day)

For each day in the segment, the system reads:
- **Day's activity list** with names and coordinates (lat/lng)
- **Day's general area** (derived from activity cluster center)
- **Accommodation location** (hotel lat/lng if available, segment location as fallback)
- **Segment region + country** (for regional food matching)
- **User preferences** (from the preferences modal)

## Algorithm

### Per-Segment Flow (one click → fills all days)

1. **Load all days** in the segment with their activities and coordinates
2. **For each day**, compute the day's activity area:
   - Cluster center of all activities with coordinates on that day
   - If no coords, fall back to accommodation location, then segment location
3. **For each meal slot** (breakfast, lunch, dinner) on each day:
   - Build a location-aware search query:
     - Breakfast: near accommodation or first activity area
     - Lunch: near the day's midday activity area
     - Dinner: near the day's last activity area or accommodation
   - Include the region's food identity in the prompt
4. **Call Perplexity** with a day-specific, location-aware prompt:
   - "Best authentic [breakfast/lunch/dinner] near [area/neighborhood] in [city], [region]. Regional specialty: [regional dishes]. Activities nearby: [list]. Not tourist traps."
5. **Call Claude** to extract structured restaurant data from Perplexity's response
6. **Ground with Google Places** to get place_id, verified coordinates, rating, photos
7. **Write to DB**: insert or replace meal activity for that slot on that day, with sort_order that fits the day's flow (breakfast early, lunch mid, dinner end)

### API Call Efficiency

- One Perplexity call per day per meal type (not per segment) — this ensures day-specific location context
- For a 7-day segment: 21 Perplexity calls, 21 Claude calls, ~42 Google Places calls (primary + backup)
- Estimated cost per segment: ~$3-5 Perplexity, ~$0.50 Claude, ~$1 Google Places

## Output Per Restaurant

Each researched meal activity includes:

| Field | Description | Example |
|-------|-------------|---------|
| **Restaurant name** | Exact name | "Casinha do Petisco" |
| **Google rating** | Stars + review count | 4.7/5 (2,413 reviews) |
| **Top 3 dishes to order** | Specific dishes with descriptions | "Cataplana — legendary seafood stew in copper pan [LOCAL SPECIALTY]" |
| **Why this place** | One-liner local insight | "Family-run institution — locals pilgrimage here for the definitive cataplana" |
| **Logistics** | Reservation, cash, walk-in tips | "Reserve ahead. Cash only. Arrive by 7pm." |
| **Kid-friendly dishes** | FYI only, not a requirement | "Grilled fish and rice are kid-safe" or "No specific kid options" |
| **Coordinates** | Verified lat/lng from Google Places | For map rendering |
| **Photos** | Up to 10 from Google Places | For browse page carousel |

## Options Per Meal

- **1 primary pick** — the recommended restaurant
- **1 backup** — an alternative if plans change or the primary is full

## Schedule Integration

The system has **full control** over meal activities:
- **Insert** new meal activities if none exist for that slot
- **Replace** existing meal placeholders (any restaurant-type activity on that day for that meal type) with the researched pick
- **Reorder** sort_order so the day flows naturally: morning activities → lunch → afternoon activities → dinner
- **Do NOT touch** non-meal activities (sightseeing, transport, downtime)

## Lodging Dependency

Meal research is positioned **after lodging** in the planning steps. If a segment has no lodging set when Research is clicked, the system shows a warning: "No lodging set — proceed anyway?" The user can proceed (using segment location as fallback) or go set lodging first. **Lodging is not a hard gate** — the system always plans all meals regardless. But lodging location improves breakfast proximity and dinner return-to-hotel picks.

## Preferences (stored in `travel_settings.meal_preferences`)

Displayed as an editable modal on the Meal Research step. Persists across sessions.

| Preference | Options | Default |
|-----------|---------|---------|
| Dining style | Adventurous / Balanced / Safe picks | Adventurous |
| Budget | Budget / Moderate / No limit | No limit |
| Priorities | Authenticity, Local specialties, Proximity, Reviews | Authenticity + Local specialties |
| Avoid | Tourist traps, Chains, Overly formal | Tourist traps |
| Cuisine interests | Regional specialties, Seafood, Street food, Markets, etc. | Regional specialties |
| Dietary restrictions | Free text | None |
| Family context | Free text | (from family profile) |

## UI

### Plan Page — Meal Research Step

- Per-segment table showing: Segment | Days | Meals Researched | [Research] button
- Preferences gear icon → opens modal
- "Research" button runs the full pipeline for all days in that segment
- Shows spinner during research, toast on completion

### Browse Page — Restaurant Card

Already implemented in `TripBrowseContent.tsx`. Renders:
- Restaurant name + cuisine type badge
- Google rating
- "Must-Try Dishes" section with dish cards
- Badges (highchair, outdoor seating, etc.)
- Photos carousel
- Local insight text

### Preferences Modal

Viewable/editable popup with all preference fields above. Saved to DB on close. Same criteria documented in this PRD.

## Technical Notes

- Perplexity model: `sonar` with web search
- Claude model: `claude-haiku-4-5-20251001` for structured extraction
- Google Places: `searchText` with location bias from day's activity coordinates
- Photos: up to 10 per primary restaurant, stored in `trip_media`
- Source tracking: `restaurant_suggestion_source = 'web_research'`
- Endpoint: `POST /api/v1/travel/trips/:tripId/segments/:segmentId/meal-research`

## What This Replaces

The previous implementation was wrong:
- Batched one search per meal type per city (not per day)
- Rotated results randomly across days (no route awareness)
- Depended on existing activity names to decide what to research
- The rewrite makes every search day-specific and location-aware
