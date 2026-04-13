# PRD: Instagram-Style Mobile Trip Viewer (Details2 Story Mode)

## Overview

Transform the details2 trip data into a vertical-scrolling, Instagram/TikTok-style mobile experience — full-screen cards that you swipe through, one activity/moment at a time. Think Instagram Stories meets travel itinerary.

## Problem

The details2 page is information-dense and designed for desktop editing/planning. On mobile, it's a wall of text. For casual consumption (sharing with family, reviewing on the couch, showing friends), a card-by-card swipe experience is far more engaging.

## Route

```
/travel/[id]/stories
```

Accessible from the trip navigation. Mobile-optimized but works on desktop too.

## Core UX

### Card Types

Each card is a **full-viewport-height snap-scroll section** with a hero visual background and overlay content.

#### 1. Trip Title Card
```
┌─────────────────────┐
│                     │
│   [Hero photo]      │
│                     │
│   ─────────────     │
│   PORTUGAL 2026     │
│   Jun 15 - Jul 6    │
│   3 weeks · 6 cities│
│                     │
│         ↓           │
└─────────────────────┘
```

#### 2. Segment Intro Card
```
┌─────────────────────┐
│                     │
│   [City photo]      │
│                     │
│   ─────────────     │
│   LISBON            │
│   Jun 15-18 · 4 days│
│                     │
│   "Where fado music │
│   echoes through    │
│   cobblestone       │
│   alleys..."        │
│                     │
│   🏨 Hyatt Regency  │
│         ↓           │
└─────────────────────┘
```

#### 3. Day Header Card
```
┌─────────────────────┐
│                     │
│   [Day route map]   │
│                     │
│   ─────────────     │
│   DAY 3 · WEDNESDAY │
│   Jun 17            │
│                     │
│   "Castle Day"      │
│                     │
│   4 activities      │
│   2 restaurants     │
│         ↓           │
└─────────────────────┘
```

#### 4. Activity Card (the main card type)
```
┌─────────────────────┐
│                     │
│   [Activity photo]  │
│   [Ken Burns slow   │
│    zoom animation]  │
│                     │
│   ─────────────     │
│   Belém Tower       │
│   9:00 AM · 1.5 hrs │
│   ★ Must Do         │
│                     │
│   "A 16th-century   │
│   fortress that     │
│   watched over..."  │
│                     │
│   💡 Parker: Look   │
│   for the rhinoceros│
│   carved in stone!  │
│                     │
│   📍 Tap for map    │
│         ↓           │
└─────────────────────┘
```

#### 5. Restaurant Card
```
┌─────────────────────┐
│                     │
│   [Restaurant photo]│
│                     │
│   ─────────────     │
│   🍽 Cervejaria     │
│     Ramiro          │
│   12:30 PM · Lunch  │
│   ★★★★½ (4.6)      │
│                     │
│   Seafood · €€€     │
│                     │
│   MUST TRY:         │
│   · Tiger prawns    │
│   · Prego sandwich  │
│                     │
│   💡 "Ask for the   │
│   garlic butter..." │
│         ↓           │
└─────────────────────┘
```

#### 6. Fun Fact Card (interspersed)
```
┌─────────────────────┐
│                     │
│   [Relevant photo]  │
│                     │
│   ─────────────     │
│                     │
│   DID YOU KNOW?     │
│                     │
│   "Lisbon's trams   │
│   have been running │
│   since 1873 —      │
│   older than the    │
│   Eiffel Tower"     │
│                     │
│                     │
│         ↓           │
└─────────────────────┘
```

#### 7. Kid Callout Card (interspersed)
```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │ 🎯 PARKER     │  │
│  │               │  │
│  │ Challenge:    │  │
│  │ Count all the │  │
│  │ gargoyles on  │  │
│  │ the castle!   │  │
│  │               │  │
│  │ Can you find  │  │
│  │ the one that  │  │
│  │ looks like a  │  │
│  │ dragon?       │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ 🎨 CHARLOTTE  │  │
│  │               │  │
│  │ The tiles on  │  │
│  │ this building │  │
│  │ tell a story! │  │
│  │ What colors   │  │
│  │ can you spot? │  │
│  └───────────────┘  │
│         ↓           │
└─────────────────────┘
```

#### 8. Accommodation Card
```
┌─────────────────────┐
│                     │
│   [Hotel photos     │
│    carousel]        │
│                     │
│   ─────────────     │
│   🏨 Hyatt Regency  │
│   Lisbon            │
│   ★★★★ · 4.2        │
│                     │
│   Check-in: 3:00 PM │
│   3 nights          │
│                     │
│   🏊 Pool · ☕ Bkfst │
│   🅿️ Parking · 💪 Gym│
│                     │
│   "Guests love the  │
│   rooftop pool      │
│   views..."         │
│         ↓           │
└─────────────────────┘
```

### Navigation

- **Vertical snap-scroll** (CSS `scroll-snap-type: y mandatory`)
- **Progress dots** on right edge showing position within segment
- **Top bar**: Segment name + day indicator (sticky, semi-transparent)
- **Bottom pill**: "Day 3 · 4/12" showing card position
- **Swipe right**: Skip to next day
- **Swipe left**: Go back to previous day
- **Tap bottom**: Expand practical details (hours, cost, booking)

### Visual Treatment

- **Full-bleed photos** as card backgrounds with dark gradient overlay at bottom
- **Ken Burns animation** — slow subtle zoom on photos while card is in view
- **Parallax** — photo scrolls slightly slower than text content
- **Color coding** — segment color accent (emerald, blue, amber, purple, rose) carries through cards
- **Typography**: Large, bold, high-contrast white text on photo backgrounds
- **Glassmorphism**: Semi-transparent frosted panels for text blocks over photos

## Technical Implementation

### Core Component Structure

```
app/(dashboard)/travel/[id]/stories/page.tsx
components/travel/stories/
  StoryViewer.tsx          — Main snap-scroll container
  TripTitleCard.tsx        — Trip intro card
  SegmentIntroCard.tsx     — City/region intro
  DayHeaderCard.tsx        — Day start with map
  ActivityCard.tsx         — Activity detail card
  RestaurantCard.tsx       — Restaurant variant
  FunFactCard.tsx          — Interspersed fact cards
  KidCalloutCard.tsx       — Kid engagement cards
  AccommodationCard.tsx    — Hotel/lodging cards
  StoryProgress.tsx        — Right-edge progress dots
  StoryNav.tsx             — Top bar + bottom pill
```

### Data Flow

```typescript
// Flatten trip data into ordered card array
function buildStoryCards(trip: Trip): StoryCard[] {
  const cards: StoryCard[] = []

  cards.push({ type: 'trip-title', data: trip })

  for (const segment of trip.segments) {
    cards.push({ type: 'segment-intro', data: segment })

    // Accommodation card if first day of segment
    const segAccom = trip.accommodations.find(a => /* matches segment */)
    if (segAccom) cards.push({ type: 'accommodation', data: segAccom })

    for (const day of segment.days) {
      cards.push({ type: 'day-header', data: day })

      for (const activity of day.activities.filter(a => !a.is_backup)) {
        // Activity or restaurant card
        if (activity.activity_type === 'restaurant') {
          cards.push({ type: 'restaurant', data: activity })
        } else if (activity.activity_type !== 'transport' && activity.activity_type !== 'logistics') {
          cards.push({ type: 'activity', data: activity })
        }

        // Intersperse fun fact cards (from deep_dive.interesting_facts)
        if (activity.deep_dive?.interesting_facts?.length) {
          cards.push({ type: 'fun-fact', data: {
            fact: activity.deep_dive.interesting_facts[0],
            photo: getActivityPhoto(activity)
          }})
        }

        // Kid callout cards (from kid_engagement)
        if (activity.kid_engagement) {
          cards.push({ type: 'kid-callout', data: {
            activity: activity.name,
            engagement: activity.kid_engagement
          }})
        }
      }
    }
  }

  return cards
}
```

### Key CSS

```css
.story-container {
  height: 100dvh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
}

.story-card {
  height: 100dvh;
  scroll-snap-align: start;
  position: relative;
  overflow: hidden;
}

.story-card-bg {
  position: absolute;
  inset: 0;
  object-fit: cover;
  animation: ken-burns 20s ease-in-out infinite alternate;
}

.story-card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
}

@keyframes ken-burns {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.1) translate(-2%, -1%); }
}
```

### Scroll Performance

- Use `Intersection Observer` to lazy-load photos (only load ±2 cards from viewport)
- Preload next card's photo when current card is 50% scrolled
- Use `will-change: transform` on photo backgrounds
- Virtualize card list for trips with 100+ cards (react-virtuoso or similar)

### Photo Selection Priority

For each card's background photo:
1. Activity-specific photos from `trip.media` where `parent_id = activity.id`
2. Segment-level photos from `trip.media` where `parent_id = segment.id`
3. Accommodation photos (for hotel-related activities)
4. Fallback: gradient background with large text (no photo)

### Sharing / Standalone Mode

- `/travel/[id]/stories` works for authenticated users
- Could extend to public share links (existing share infrastructure)
- Add "Share this card" → generates a static image of the card (html-to-canvas or server-side)

## Content Filtering

Users should be able to filter what card types appear:

- **Full** (default): All card types
- **Highlights**: Only must_do activities + restaurants + segment intros
- **Kids Mode**: Prioritize kid callout cards, fun facts, and kid-friendly activities
- **Practical**: Activities + restaurants only (no fun facts, no kid callouts)

Filter selector as pills at the top, or swipe-to-access settings.

## Responsive Behavior

- **Mobile** (primary): Full-screen snap-scroll cards, touch gestures
- **Tablet**: Same layout, larger text, potentially 2-column for practical details
- **Desktop**: Centered phone-frame mockup (max-width: 430px, centered, with trip sidebar)

## Implementation Priority

### MVP (Phase 1)
- [ ] Snap-scroll container with card components
- [ ] Trip title + segment intro + day header cards
- [ ] Activity cards with photo backgrounds
- [ ] Restaurant cards with must-try dishes
- [ ] Progress dots + nav bar
- [ ] Photo selection logic from existing media

### Phase 2
- [ ] Fun fact cards interspersed
- [ ] Kid callout cards
- [ ] Accommodation cards with amenity icons
- [ ] Ken Burns photo animation
- [ ] Horizontal swipe for day-skip

### Phase 3
- [ ] Content filtering (Full/Highlights/Kids/Practical)
- [ ] Share individual cards as images
- [ ] Desktop phone-frame view
- [ ] Parallax scroll effects
- [ ] Glassmorphism panels

## Dependencies

- Existing trip data model (segments, days, activities, media)
- Existing photo/media infrastructure
- Existing DayRouteMap component (for day header cards)
- Tailwind CSS (already in stack)
- No new external dependencies for MVP
