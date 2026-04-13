# PRD: Travel Trip Podcast Video Generator

## Overview

Generate NotebookLM-style podcast videos from trip data — two AI voices having an engaging, natural conversation about the trip while showing photos, animated maps, text overlays, and stock b-roll footage. Videos are organized in a zoom-in hierarchy from trip overview down to per-day detail.

## Problem

Richard builds incredibly detailed trip plans with deep cultural context, kid engagement scripts, restaurant deep-dives, and day-by-day itineraries — but hasn't actually read through all the content. The family (including 3 kids ages ~3, 5, 7) needs an engaging way to absorb this information before and during the trip.

## Audience

- Richard (primary) — absorb his own trip research in an engaging format
- Kids (Parker ~7, Charlotte ~5, Xander ~3) — get excited about the trip, learn fun facts
- Family — shared viewing experience

## Video Hierarchy (Zoom Levels)

| Level | Scope | Target Length | Content Density |
|-------|-------|--------------|-----------------|
| **L1: Trip Overview** | Entire trip | 3-5 min | High-level: where we're going, when, highlights, what's exciting |
| **L2: Segment Overview** | Per segment (city/region) | 3-5 min | City intro, culture, cuisine, key activities, accommodation |
| **L3: Day Detail** | Per day | 5-10 min | Walk through each activity, timing, tips, restaurant details, kid callouts |

Each level is a standalone video. L1 produces 1 video. L2 produces N videos (one per segment). L3 produces M videos (one per day).

## Core Experience

### Two-Host Podcast Format

Two distinct AI voices — an enthusiastic "travel host" and a curious "co-host" — have a natural back-and-forth conversation:

```
HOST: "Okay so Day 3 — this is the Sintra day and honestly? This might be the
      day the kids talk about for years."
CO-HOST: "Wait, is this the one with the colorful castle?"
HOST: "Pena Palace! It looks like someone let a 5-year-old design a castle and
      then actually built it. Charlotte is going to lose her mind."
```

**Key qualities:**
- Natural speech patterns (filler words, interruptions, genuine reactions)
- Reference kids by name with age-appropriate callouts
- Mix practical info with storytelling and fun facts
- Keep individual lines short (<100 chars / 5-8 seconds spoken)

### Visual Layers (simultaneous)

1. **Background**: Photos (Ken Burns pan/zoom) or stock video clips of locations
2. **Map layer**: Animated route maps showing travel between stops
3. **Text overlays**:
   - Fun fact pop-ups (different visual style from narration — grabs different attention)
   - Kid callouts (e.g., "Parker — look for the dragon gargoyle on the left tower!")
   - Practical info cards (times, costs, tips)
4. **Transitions**: Smooth segment/day transitions with title cards

### Dual-Modality Engagement

The audio and visual text convey **different but complementary** information:
- Audio: storytelling, cultural context, excitement, conversation
- Text pop-ups: specific facts, kid challenges, practical details
- This means kids can engage via audio OR reading, and both channels reinforce without being redundant

## Technical Architecture

### Pipeline

```
┌─────────────────┐
│  Trip Data       │  (Supabase: segments, days, activities, media)
│  + Photos        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 1. Script Gen   │  Claude/GPT-4o generates two-person podcast script
│    (LLM)        │  with visual cue markers [SHOW_PHOTO:activity_id]
│                 │  [SHOW_MAP:segment], [TEXT_POPUP:fact], [KID_CALLOUT:name]
└────────┬────────┘
         │  Structured JSON output (Zod/Pydantic schema)
         ▼
┌─────────────────┐
│ 2. Audio Gen    │  ElevenLabs v3 Text to Dialogue OR Gemini 2.5 Flash TTS
│    (TTS API)    │  → Multi-speaker audio file + word-level timestamps
└────────┬────────┘
         │  .mp3/.wav + timestamps JSON
         ▼
┌─────────────────┐
│ 3. Asset Prep   │  Collect: trip photos, Pexels stock video,
│                 │  Mapbox static/animated routes, title card assets
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Video Comp   │  Remotion (React) composes all layers:
│    (Remotion)   │  audio + photos (Ken Burns) + maps + text overlays
│                 │  + transitions + kid callouts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Render       │  Remotion Lambda → S3 → CDN
│    (Lambda)     │  ~60s render time, ~$0.10/video
└─────────────────┘
```

### Step 1: Script Generation

**Input**: Structured trip data JSON (segments, days, activities with deep_dive, kid_engagement, restaurant_details, etc.)

**LLM prompt structure**:
- System: "You are a world-class travel podcast producer creating an engaging two-host conversation"
- Include persona definitions (Host = enthusiastic expert, Co-Host = curious parent)
- Include all trip data for the target scope (trip/segment/day)
- Include kid names + ages for personalized callouts
- Instruct: weave in deep_dive.the_story, interesting_facts, kid_engagement by age
- Instruct: embed visual cue markers in the script

**Output schema** (Zod):
```typescript
const ScriptLine = z.object({
  speaker: z.enum(['host', 'cohost']),
  text: z.string().max(200),
  visual_cue: z.optional(z.object({
    type: z.enum(['photo', 'video', 'map', 'text_popup', 'kid_callout', 'title_card']),
    ref: z.string(),       // activity_id, segment_id, fact text, kid name
    detail: z.optional(z.string())  // additional context
  }))
})

const PodcastScript = z.object({
  scratchpad: z.string(),  // LLM plans narrative arc first
  title: z.string(),
  level: z.enum(['trip', 'segment', 'day']),
  dialogue: z.array(ScriptLine),
  estimated_duration_seconds: z.number()
})
```

### Step 2: Audio Generation

**Recommended: ElevenLabs v3 Text to Dialogue**
- Single API call, two voices in one request
- Audio Tags for emotion: `[excited]`, `[laughs]`, `[whispering]`
- Returns word-level timestamps for caption sync
- ~$1-2 per 10 minutes of audio (Creator plan)

**Alternative: Gemini 2.5 Flash TTS**
- `MultiSpeakerVoiceConfig` with 2 speakers
- 30 voice options, emotion via natural language prompts
- ~$0.015/minute — much cheaper
- May be slightly less expressive than ElevenLabs

**Fallback: OpenAI gpt-4o-mini-tts**
- Generate each speaker's lines separately, concatenate
- Loses natural conversational overlap
- $0.015/min, 13 voices

### Step 3: Asset Collection

| Asset Type | Source | Notes |
|-----------|--------|-------|
| Trip photos | Supabase storage (trip media) | Ken Burns pan/zoom via Remotion |
| Stock video b-roll | Pexels Video API (free, 20K req/mo) | Search by location name |
| Map routes | Mapbox GL JS (via Remotion integration) | Animate camera along route |
| Aerial flyovers | Google Aerial View API (US only) | Cinematic 3D building flyovers |
| Title cards | Generated Remotion components | Styled React components |

### Step 4: Video Composition (Remotion)

**Tech stack**: Remotion + React + TypeScript (matches existing web stack)

**Composition layers**:
```
Layer 5 (top):  Kid callout text overlays (spring animations)
Layer 4:        Fun fact text pop-ups (fade in/out)
Layer 3:        Animated captions (@remotion/captions, karaoke style)
Layer 2:        Map animations (Mapbox GL, camera path)
Layer 1:        Background visuals (Ken Burns photos / stock video)
Layer 0:        Audio track (podcast narration)
```

**Key Remotion features used**:
- `<Sequence>` for time-based sections
- `<Series>` for sequential photo/video segments
- `interpolate()` for Ken Burns zoom/pan
- `spring()` for bouncy text popups
- `@remotion/captions` for word-level caption highlighting
- Mapbox integration for animated route maps
- `<Audio>` for synced podcast narration

### Step 5: Cloud Rendering

**Remotion Lambda**:
- Deploy Remotion project to S3
- Trigger render via Lambda API
- Parallel chunk rendering → stitch → upload to S3
- ~60 seconds for 10-min HD video
- ~$0.10 per render
- Output stored in Supabase storage or S3, served via CDN

## Cost Estimate Per Trip

| Component | Per Video | Full Trip (1 overview + 6 segments + 20 days = 27 videos) |
|-----------|-----------|-----------------------------------------------------------|
| Script gen (Claude) | ~$0.05 | ~$1.35 |
| Audio gen (ElevenLabs) | ~$1.50 | ~$40.50 |
| Audio gen (Gemini alt) | ~$0.10 | ~$2.70 |
| Stock video (Pexels) | Free | Free |
| Video render (Lambda) | ~$0.10 | ~$2.70 |
| **Total (ElevenLabs)** | **~$1.65** | **~$44.55** |
| **Total (Gemini)** | **~$0.25** | **~$6.75** |

## Script Generation: Prompt Design

### L1 (Trip Overview) — System prompt excerpt:
```
You're producing a 3-5 minute travel podcast overview. Two hosts — Alex (enthusiastic,
knowledgeable) and Sam (curious, asks great questions). They're discussing an upcoming
family trip to Portugal with 3 kids: Parker (7), Charlotte (5), and Xander (3).

Structure:
1. HOOK: Open with something exciting or surprising about the destination
2. THE BIG PICTURE: Where, when, how long, what's the vibe
3. SEGMENT TEASERS: Brief exciting preview of each city/region
4. KID MOMENTS: What the kids are going to love (call them by name)
5. FOOD PREVIEW: Highlight 2-3 must-try dishes
6. WRAP: Build anticipation, what to look forward to

Rules:
- Keep lines under 100 characters for natural TTS
- Include [SHOW_PHOTO:segment_id] markers when referencing specific places
- Include [TEXT_POPUP:fact] for interesting facts to show as on-screen text
- Include [KID_CALLOUT:Parker|Charlotte|Xander] when calling out a specific kid
- Be genuinely excited, not scripted-sounding
- Include at least 3 interesting facts that would surprise adults
- Include at least 2 moments specifically for each kid
```

### L3 (Day Detail) — Additional instructions:
```
Walk through the day chronologically. For each activity:
- What it is and why it matters (use deep_dive.why_it_matters)
- A story or fun fact (use deep_dive.the_story, interesting_facts)
- Kid engagement moment (use kid_engagement data, call out by name and age)
- Practical tip woven naturally into conversation
- Restaurant activities: highlight 1-2 must-try dishes with descriptions

Between activities, mention travel time and how to get there.
For text pop-ups, use DIFFERENT facts than what's being spoken — complementary info.
```

## Data Fields Used Per Level

### L1 (Trip Overview)
- `trip.name`, `trip.description`, `trip.start_date`, `trip.end_date`
- `segment[].name`, `segment[].theme`, `segment[].city_info.intro`
- `segment[].city_info.cuisine.signature_dishes` (highlights)
- Top `must_do` activities across all segments
- `accommodation[].name` (where we're staying)

### L2 (Segment Overview)
- `segment.city_info` (full: intro, deep_history, culture, cuisine)
- `segment.main_attractions`
- `segment.accommodation` (recommendations, area info)
- `day[].title`, `day[].theme` (preview of each day)
- Key activities per day (must_do only)
- `accommodation.guest_insights` (what guests love)

### L3 (Day Detail)
- `day.title`, `day.theme`, `day.overview`
- `activity[].name`, `.description`, `.why_its_great`
- `activity[].deep_dive` (full: what_it_is, why_it_matters, the_story, interesting_facts)
- `activity[].kid_engagement` (age_7, age_5, age_3, general)
- `activity[].restaurant_details` (cuisine, signature_dishes, local_insight, family_tips)
- `activity[].practical_details` (hours, cost, tips)
- `activity[].warnings`
- `day.meals` (breakfast, lunch, dinner plans)
- `day.backup_plan` (if_rain, if_tired, if_kids_meltdown)
- Travel hints between activities (distance, time)

## Implementation Phases

### Phase 1: Script Generation + Audio (MVP)
- Build script generation pipeline (LLM → structured JSON)
- Integrate ElevenLabs or Gemini TTS for dual-voice audio
- Output: downloadable podcast audio files (no video yet)
- **This alone is valuable** — listen in the car, at bedtime, etc.

### Phase 2: Basic Video (Photos + Audio)
- Set up Remotion project in the monorepo
- Ken Burns photo slideshow synced to audio timestamps
- Animated captions (word-level highlighting)
- Title cards for segment/day transitions
- Render via Remotion Lambda

### Phase 3: Rich Video (Maps + Text + B-Roll)
- Mapbox animated route maps between activities
- Text pop-up overlays (fun facts, kid callouts)
- Pexels stock video b-roll integration
- Kid-specific callout animations (bouncy text, color-coded per kid)

### Phase 4: Polish
- Transition animations between sections
- Background music (subtle, royalty-free)
- Intro/outro sequences
- Video player UI in the app
- Regeneration controls (retry specific sections)

## Open Questions

1. **Voice selection**: Should the hosts have specific voice characteristics? (e.g., male/female, accents?)
2. **Music**: Add subtle background music? If so, royalty-free library or AI-generated?
3. **Video storage**: Supabase storage (simple) vs S3 + CloudFront (scalable)?
4. **Regeneration**: Should users be able to regenerate specific sections or only full videos?
5. **Caching**: Cache scripts and audio separately so visual updates don't require re-generating audio?
6. **YouTube clips**: For internal/private use, is fair use acceptable for short clips? Legal gray area — probably stick with Pexels + own photos.

## Key Technical Dependencies

| Dependency | Purpose | Cost |
|-----------|---------|------|
| ElevenLabs v3 or Gemini TTS | Dual-voice podcast audio | $22/mo (EL Creator) or pay-per-use (Gemini) |
| Remotion | React video framework | Free (≤3 employees) |
| Remotion Lambda | Cloud rendering | ~$0.10/video |
| Pexels API | Stock b-roll video | Free |
| Mapbox | Animated route maps | Free tier (50K loads/mo) |
| Claude/GPT-4o | Script generation | ~$0.05/script |

## Success Criteria

- [ ] Trip overview video generates and plays in under 3 minutes
- [ ] Audio sounds natural — you'd listen to it voluntarily, not just because it's useful
- [ ] Kids' names are called out with age-appropriate content
- [ ] Text overlays provide complementary (not redundant) info to audio
- [ ] Map animations show clear route between activities
- [ ] Full trip video set (all levels) generates for under $10 (Gemini path) or $50 (ElevenLabs path)
