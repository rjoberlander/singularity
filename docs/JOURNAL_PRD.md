# Singularity Journal Module — PRD & Development Plan

**Version:** 1.0 MVP
**Last Updated:** January 3, 2026
**Inspired By:** Day One Journal App

---

## Table of Contents

1. [Vision & Overview](#vision--overview)
2. [Core Principles](#core-principles)
3. [Feature Specifications](#feature-specifications)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [UI/UX Specifications](#uiux-specifications)
7. [Technical Architecture](#technical-architecture)
8. [Development Phases](#development-phases)
9. [Future Enhancements](#future-enhancements)

---

## Vision & Overview

### Product Vision

A beautifully simple journaling experience within Singularity that allows users to capture life's moments with text, photos, and videos — and optionally send them as "time capsules" to loved ones in the future.

### Core Value Proposition

- **Dead Simple Entry Creation:** Tap → optional prompt → write/add media → done
- **Beautiful Auto-Layout:** Instagram-style dynamic photo/video grids
- **Time Capsule Feature:** Schedule entries to be emailed to recipients years in the future
- **Public Sharing:** Generate shareable links for any entry
- **Memory Surfacing:** "On This Day" feature shows past entries from the same date

### Target Platforms

| Platform | Priority | Notes |
|----------|----------|-------|
| Mobile Web | **Highest** | Mobile-first responsive design |
| Desktop Web | High | Full feature parity |
| Native Mobile | Future | React Native via Expo |

---

## Core Principles

1. **Simplicity First** — Entry creation must be fast and frictionless
2. **Beautiful by Default** — Auto-formatting handles layout; users don't need to design
3. **Mobile-First** — Touch-friendly, thumb-reachable UI
4. **Markdown Lite** — Simple formatting without complexity
5. **Privacy with Sharing** — Private by default, easy to share when desired

---

## Feature Specifications

### Feature 1: Journal Entry Creation

#### Entry Modes

Users choose their entry mode at the start:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Free Form** | Blank canvas, write anything | Open journaling |
| **Guided Prompt** | Pre-built or AI-generated question | Structured reflection |

#### Guided Prompts System

**Prompt Sources:**
- Curated prompts (admin-defined defaults)
- AI-generated daily prompts (via Claude)
- User-created custom prompts

**Example Curated Prompts:**
```
- What made you smile today?
- What are you grateful for?
- What did you learn today?
- What's one thing you want to remember about today?
- How are you feeling right now?
- What's on your mind?
- Describe a moment from today in detail.
- What would you tell your future self?
```

**Prompt Format:** Single question per entry (not multi-question flows)

#### Rich Text Support (Markdown Lite)

Following Day One's approach — simple, clean markdown:

| Feature | Syntax | Rendered |
|---------|--------|----------|
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Headers | `# H1` `## H2` `### H3` | Scaled headings |
| Lists | `- item` or `1. item` | Bullet/numbered lists |
| Checklists | `- [ ] task` | Toggleable checkboxes |
| Links | `[text](url)` | Clickable links |
| Blockquotes | `> quote` | Styled quote block |
| Highlights | `==text==` | Highlighted text |

**Editor UI:**
- Floating formatting toolbar appears when text selected
- Markdown auto-converts as you type (like Day One)
- Clean, distraction-free writing surface

---

### Feature 2: Media Handling (Photos & Videos)

#### Specifications

| Attribute | Value | Notes |
|-----------|-------|-------|
| Max media per entry | 30 | Matches Day One Premium |
| Supported image formats | JPEG, PNG, WebP, HEIC | HEIC converted server-side |
| Supported video formats | MP4, MOV, WebM | H.264 codec preferred |
| Max video length | 5 minutes | Per video clip |
| Max video file size | 100MB | Per video |
| Image optimization | Auto-resize to 2000px max | Via Sharp |

#### Upload Methods

- **Camera capture** (mobile) — in-app camera access
- **Photo library** — select from device
- **Drag & drop** (desktop) — drop zone in editor
- **Clipboard paste** — Ctrl/Cmd+V
- **File browser** — traditional file picker

#### Instagram-Style Dynamic Grid Layout

Photos auto-arrange into an aesthetically pleasing grid:

```
1 photo:     [████████████████]
             Full width

2 photos:    [███████] [███████]
             Side by side

3 photos:    [████████████████]
             [███████] [███████]

4 photos:    [███████] [███████]
             [███████] [███████]

5+ photos:   Dynamic masonry grid
             with varying sizes
```

**Grid Behavior:**
- First photo/video is always largest (hero)
- Remaining media fills grid intelligently
- Tap any item to view full-screen lightbox
- Swipe through media in lightbox
- Long-press to delete/reorder

#### Video Playback

- Inline preview with play button overlay
- Tap to play (no autoplay)
- Full-screen playback option
- Muted by default, tap for audio

---

### Feature 3: Entry Metadata

#### Auto-Captured Metadata

| Field | Source | Editable |
|-------|--------|----------|
| Date | System clock | Yes |
| Time | System clock | Yes |
| Location | Device GPS / IP geolocation | Yes |
| Weather | OpenWeatherMap API (from location) | Yes |

#### Weather Integration

**API:** OpenWeatherMap (free tier: 1000 calls/day)

**Captured Data:**
```json
{
  "condition": "Partly Cloudy",
  "temp_f": 72,
  "temp_c": 22,
  "icon": "partly-cloudy"
}
```

**Display:** Weather icon + temperature shown on entry

**Manual Override:** User can type custom weather if desired

#### Location Handling

- Auto-detect via browser/device geolocation API
- Reverse geocode to readable address
- User can search and select different location
- Privacy option: disable auto-location per entry or globally

---

### Feature 4: Mood Tracking

#### Mood Selection UI

Quick-select mood at entry creation (optional):

**Preset Moods (6 options):**

| Emoji | Label | Color |
|-------|-------|-------|
| 😊 | Happy | Green |
| 😌 | Calm | Blue |
| 😐 | Neutral | Gray |
| 😔 | Sad | Blue-gray |
| 😢 | Down | Purple |
| 😤 | Frustrated | Red |

**Custom Entry:** User can type custom mood text

**UI Pattern:**
- Horizontal scrollable emoji row
- Tap to select (single selection)
- "Skip" option if user doesn't want to track

---

### Feature 5: Organization & Navigation

#### Tags System

- Entries can have multiple tags
- Tags double as "journals" (e.g., `#personal`, `#travel`, `#family`)
- Filter entries by tag
- Auto-suggest existing tags while typing
- Create new tags inline

**Example Tags:**
```
#personal #travel #family #gratitude #work #health #dreams
```

#### Views & Filtering

| View | Description |
|------|-------------|
| Timeline | Chronological list (default) |
| Calendar | Month view with entry dots |
| Tags | Grouped by tag/journal |
| On This Day | Same date, past years |

#### Search

- Full-text search across entry content
- Filter by: date range, tags, mood, has media
- Search within specific tag/journal

---

### Feature 6: "On This Day" Feature

**Purpose:** Surface memories from past years on the same calendar date

**Behavior:**
- Shows entries from 1 year ago, 2 years ago, etc.
- Notification/prompt on app open: "You have 3 memories from this day"
- Dedicated "On This Day" view in navigation
- Card-style preview with photos and excerpt

**Example:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📅 On This Day
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1 YEAR AGO — January 3, 2025
  ┌─────────────────────────────┐
  │ [Photo Grid]                │
  │ "Today we went to the park  │
  │  and Emma took her first... │
  └─────────────────────────────┘

  3 YEARS AGO — January 3, 2023
  ┌─────────────────────────────┐
  │ Started the new year with   │
  │ a resolution to journal...  │
  └─────────────────────────────┘
```

---

### Feature 7: Public Sharing

#### Sharing Options

| Type | Description | Use Case |
|------|-------------|----------|
| **Public Link** | Anyone with URL can view | Share on social media |
| **Password Protected** | Requires password to view | Private sharing |
| **Private** | No sharing (default) | Personal entries |

#### Public Page Design

**URL Structure:** `singularity.app/journal/[entry-id]` or custom slug

**Public Page Elements:**
- Entry title (if set)
- Full entry content with formatted markdown
- Photo/video grid
- Entry date and location (optional)
- Author name and avatar (optional)
- "Powered by Singularity" footer
- Minimal, clean, magazine-style layout

**Branding Options (per entry):**
- Show/hide author name
- Show/hide avatar
- Show/hide location
- Show/hide date

#### Share Actions

- Copy link to clipboard
- Share via native share sheet (mobile)
- Generate QR code for link
- Revoke public access anytime

---

### Feature 8: Time Capsule

**Purpose:** Schedule journal entries to be delivered to recipients in the future

#### Recipient Management

**Stored Recipient Data:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Emma",
  "relationship": "Daughter",
  "email": null,          // Optional, can add later
  "phone": null,          // Optional, can add later
  "created_at": "timestamp"
}
```

**Key Points:**
- Name is required; email/phone optional
- For children without email, just store name
- Can add contact info later when they're older
- Multiple recipients per user

#### Time Capsule Assignment

**Per Entry Settings:**
```json
{
  "is_time_capsule": true,
  "recipients": ["recipient-id-1", "recipient-id-2"],
  "delivery_date": "2031-01-03",
  "reminder_sent": false,
  "delivered": false
}
```

**Delivery Date Options:**
- Preset: 1 year, 5 years (default), 10 years, 18 years
- Custom: Any future date via date picker
- Minimum: 1 month from now

**Multiple Recipients:** Single entry can go to multiple people

#### Time Capsule Email

**Email Content:**
```
Subject: A message from the past — from [Author Name]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Author Name] wrote this for you on [Original Date].
They asked that it be delivered to you today.

[Click here to read your time capsule]
→ https://singularity.app/journal/[entry-id]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

With love,
Singularity
```

**Email Design:**
- Simple, elegant, minimal
- Single CTA button to view entry
- Entry content NOT in email body (just link)
- Works as public page view

#### Author Reminders

**Reminder Schedule:**
- 30 days before delivery: "Your time capsule to [Name] will be sent in 30 days"
- 7 days before: "Your time capsule to [Name] will be sent in 7 days"
- On delivery: "Your time capsule to [Name] has been delivered"

**Reminder Actions:**
- Edit entry before sending
- Change delivery date
- Cancel time capsule
- Add/update recipient contact info

---

## Data Models

### journal_entries

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  title TEXT,
  content TEXT NOT NULL,
  content_html TEXT,                    -- Pre-rendered HTML for display

  -- Metadata
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_time TIME DEFAULT CURRENT_TIME,
  location_name TEXT,                   -- "San Francisco, CA"
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  weather_condition TEXT,               -- "Partly Cloudy"
  weather_temp_f INTEGER,
  weather_icon TEXT,

  -- Mood
  mood TEXT,                            -- "happy", "calm", "neutral", etc.
  mood_custom TEXT,                     -- User-typed custom mood

  -- Organization
  tags TEXT[],                          -- Array of tag strings

  -- Entry mode
  entry_mode TEXT DEFAULT 'freeform',   -- "freeform" | "guided"
  prompt_used TEXT,                     -- The prompt question if guided

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  public_slug TEXT UNIQUE,              -- Custom URL slug
  share_password TEXT,                  -- Hashed password if protected
  show_author BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  show_date BOOLEAN DEFAULT true,

  -- Time Capsule
  is_time_capsule BOOLEAN DEFAULT false,
  capsule_delivery_date DATE,
  capsule_delivered BOOLEAN DEFAULT false,
  capsule_reminder_30d_sent BOOLEAN DEFAULT false,
  capsule_reminder_7d_sent BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_tags ON journal_entries USING GIN(tags);
CREATE INDEX idx_journal_entries_is_public ON journal_entries(is_public) WHERE is_public = true;
CREATE INDEX idx_journal_entries_capsule ON journal_entries(capsule_delivery_date)
  WHERE is_time_capsule = true AND capsule_delivered = false;

-- RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
```

### journal_media

```sql
CREATE TABLE journal_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Media info
  media_type TEXT NOT NULL,             -- "image" | "video"
  file_url TEXT NOT NULL,               -- Supabase Storage URL
  thumbnail_url TEXT,                   -- For videos

  -- Dimensions
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,             -- For videos
  file_size_bytes BIGINT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  original_filename TEXT,
  mime_type TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_journal_media_entry_id ON journal_media(entry_id);
CREATE INDEX idx_journal_media_user_id ON journal_media(user_id);

-- RLS
ALTER TABLE journal_media ENABLE ROW LEVEL SECURITY;
```

### journal_recipients

```sql
CREATE TABLE journal_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Recipient info
  name TEXT NOT NULL,
  relationship TEXT,                    -- "Daughter", "Son", "Friend", etc.
  email TEXT,                           -- Optional
  phone TEXT,                           -- Optional

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_journal_recipients_user_id ON journal_recipients(user_id);

-- RLS
ALTER TABLE journal_recipients ENABLE ROW LEVEL SECURITY;
```

### journal_capsule_recipients

Junction table for time capsule → recipient mapping:

```sql
CREATE TABLE journal_capsule_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES journal_recipients(id) ON DELETE CASCADE,

  -- Delivery tracking
  delivered_at TIMESTAMPTZ,
  delivery_email TEXT,                  -- Email used at time of delivery

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entry_id, recipient_id)
);

-- Indexes
CREATE INDEX idx_capsule_recipients_entry ON journal_capsule_recipients(entry_id);
CREATE INDEX idx_capsule_recipients_recipient ON journal_capsule_recipients(recipient_id);

-- RLS
ALTER TABLE journal_capsule_recipients ENABLE ROW LEVEL SECURITY;
```

### journal_prompts

```sql
CREATE TABLE journal_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Prompt content
  prompt_text TEXT NOT NULL,
  category TEXT,                        -- "gratitude", "reflection", "memory", etc.

  -- Source
  source TEXT DEFAULT 'curated',        -- "curated" | "ai" | "user"
  user_id UUID REFERENCES users(id),    -- Only for user-created

  -- Usage
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_journal_prompts_active ON journal_prompts(is_active) WHERE is_active = true;
CREATE INDEX idx_journal_prompts_user ON journal_prompts(user_id) WHERE user_id IS NOT NULL;
```

---

## API Endpoints

### Journal Entries

```
# List entries
GET    /api/journal
       Query params: ?tag=family&start_date=2025-01-01&end_date=2025-12-31&mood=happy

# Get single entry
GET    /api/journal/:id

# Create entry
POST   /api/journal
       Body: { title, content, entry_date, entry_time, location_*, weather_*, mood, tags[], ... }

# Update entry
PUT    /api/journal/:id

# Delete entry
DELETE /api/journal/:id

# Get "On This Day" entries
GET    /api/journal/on-this-day
       Query params: ?date=01-03 (month-day format)
```

### Media

```
# Upload media to entry
POST   /api/journal/:id/media
       Body: multipart/form-data with files[]

# Delete media
DELETE /api/journal/:id/media/:mediaId

# Reorder media
PUT    /api/journal/:id/media/reorder
       Body: { media_ids: ["id1", "id2", "id3"] }
```

### Sharing

```
# Make entry public
POST   /api/journal/:id/share
       Body: { is_public: true, password?: string, custom_slug?: string }

# Get public entry (no auth required)
GET    /api/journal/public/:slug

# Revoke public access
DELETE /api/journal/:id/share
```

### Time Capsule

```
# Get recipients
GET    /api/journal/recipients

# Create recipient
POST   /api/journal/recipients
       Body: { name, relationship?, email?, phone? }

# Update recipient
PUT    /api/journal/recipients/:id

# Delete recipient
DELETE /api/journal/recipients/:id

# Assign time capsule
POST   /api/journal/:id/capsule
       Body: { recipient_ids: [], delivery_date: "2031-01-03" }

# Update time capsule
PUT    /api/journal/:id/capsule

# Cancel time capsule
DELETE /api/journal/:id/capsule
```

### Prompts

```
# Get random prompt
GET    /api/journal/prompts/random
       Query params: ?category=gratitude

# Get AI-generated prompt
GET    /api/journal/prompts/ai

# List user's custom prompts
GET    /api/journal/prompts/mine

# Create custom prompt
POST   /api/journal/prompts
       Body: { prompt_text, category? }
```

### Tags

```
# Get all tags with counts
GET    /api/journal/tags
       Response: [{ tag: "family", count: 42 }, ...]
```

---

## UI/UX Specifications

### Mobile-First Design

**Key Principles:**
- Thumb-zone optimization — primary actions within thumb reach
- Large touch targets (minimum 44x44px)
- Bottom sheet modals instead of page navigations
- Swipe gestures for common actions
- Pull-to-refresh on lists

### Entry Creation Flow

```
┌─────────────────────────────────────┐
│  ← Back              New Entry      │
├─────────────────────────────────────┤
│                                     │
│  How would you like to journal?     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ✏️  Free Write              │    │
│  │  Start with a blank page    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  💭  Guided Prompt           │    │
│  │  Get a question to answer   │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
         ↓ (user selects)
┌─────────────────────────────────────┐
│  ← Back              Done     ⋮     │
├─────────────────────────────────────┤
│  [Prompt question if guided]        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Start writing...            │    │
│  │                             │    │
│  │                             │    │
│  │                             │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ + Add photos or videos      │    │
│  └─────────────────────────────┘    │
│                                     │
│  😊 😌 😐 😔 😢 😤  [Mood]         │
│                                     │
│  📍 San Francisco  ☀️ 72°F         │
│  📅 Today, 3:42 PM                  │
│                                     │
├─────────────────────────────────────┤
│  [B] [I] [H] [•] [☐] ["] [🔗]      │
└─────────────────────────────────────┘
```

### Entry List View

```
┌─────────────────────────────────────┐
│  Journal                    🔍  ⋮   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Today                       │    │
│  │ ┌─────┬─────┬─────┐         │    │
│  │ │ 📷  │ 📷  │ 📷  │  3:42pm │    │
│  │ └─────┴─────┴─────┘         │    │
│  │ Had an amazing day at the   │    │
│  │ park with the kids...       │    │
│  │ #family  😊                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Yesterday                   │    │
│  │ Feeling grateful for the    │    │
│  │ little moments in life...   │    │
│  │ #gratitude  😌              │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📅 On This Day — 3 memories │    │
│  │ ───────────────────────────  │    │
│  │ See what you wrote 1, 2,    │    │
│  │ and 5 years ago →           │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
        [＋]  (FAB to create)
```

### Public Entry Page

```
┌─────────────────────────────────────┐
│                                     │
│  ┌─────────────────────────────┐    │
│  │        [HERO IMAGE]         │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  January 3, 2026                    │
│  San Francisco, CA                  │
│                                     │
│  ───────────────────────────────    │
│                                     │
│  Entry title goes here              │
│  ════════════════════               │
│                                     │
│  The full entry content renders     │
│  here with beautiful typography     │
│  and proper markdown formatting.    │
│                                     │
│  Photos and videos display in       │
│  an elegant grid layout.            │
│                                     │
│  ┌───────┬───────┬───────┐          │
│  │       │       │       │          │
│  │  📷   │  📷   │  📷   │          │
│  │       │       │       │          │
│  └───────┴───────┴───────┘          │
│                                     │
│  ───────────────────────────────    │
│                                     │
│  Written by                         │
│  [Avatar] John Smith                │
│                                     │
│  ───────────────────────────────    │
│                                     │
│       Powered by Singularity        │
│                                     │
└─────────────────────────────────────┘
```

### Time Capsule Setup

```
┌─────────────────────────────────────┐
│  ← Back         Time Capsule        │
├─────────────────────────────────────┤
│                                     │
│  💌 Create a Time Capsule           │
│                                     │
│  This entry will be delivered to    │
│  your chosen recipients on the      │
│  date you select.                   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Recipients                         │
│  ┌─────────────────────────────┐    │
│  │ ☑️  Emma (Daughter)          │    │
│  │ ☑️  Lucas (Son)              │    │
│  │ ☐  Sarah (Wife)              │    │
│  │ + Add new recipient          │    │
│  └─────────────────────────────┘    │
│                                     │
│  Delivery Date                      │
│  ┌─────────────────────────────┐    │
│  │ ○  1 year from now           │    │
│  │ ●  5 years from now          │    │
│  │ ○  10 years from now         │    │
│  │ ○  18 years from now         │    │
│  │ ○  Custom date...            │    │
│  └─────────────────────────────┘    │
│                                     │
│  📅 January 3, 2031                 │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Create Time Capsule     │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## Technical Architecture

### File Storage

**Supabase Storage Buckets:**

```
journal-media/
  ├── {user_id}/
  │   ├── images/
  │   │   └── {uuid}.jpg
  │   └── videos/
  │       ├── {uuid}.mp4
  │       └── {uuid}_thumb.jpg
```

**Storage Policies:**
- Users can only access their own files
- Public entries have public-readable media
- Signed URLs for private media

### Image Processing Pipeline

```
Upload → Validate → Resize → Optimize → Store → Return URL
         (type)    (2000px)  (quality)  (Supabase)
```

**Sharp Configuration:**
```javascript
sharp(buffer)
  .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85, progressive: true })
  .toBuffer()
```

### Video Processing

```
Upload → Validate → Generate Thumbnail → Store → Return URLs
         (size,     (ffmpeg)            (Supabase)
          duration)
```

**Thumbnail Generation:**
- Extract frame at 1 second mark
- Resize to 400px width
- JPEG quality 80

### Time Capsule Delivery System

**Cron Job:** Run daily at 9:00 AM UTC

```javascript
// Pseudo-code
async function processTimeCapsules() {
  // Get entries due for delivery today
  const dueEntries = await db.journal_entries.findMany({
    where: {
      is_time_capsule: true,
      capsule_delivered: false,
      capsule_delivery_date: { lte: today }
    },
    include: { capsule_recipients: true }
  });

  for (const entry of dueEntries) {
    for (const recipient of entry.capsule_recipients) {
      if (recipient.email) {
        await sendTimeCapsuleEmail(entry, recipient);
      }
      // Mark as delivered
      await markDelivered(entry.id, recipient.id);
    }
  }
}
```

**Reminder Cron:** Also run daily

```javascript
async function sendReminders() {
  // 30-day reminders
  const thirtyDayEntries = await getEntriesDueIn(30);
  // 7-day reminders
  const sevenDayEntries = await getEntriesDueIn(7);

  // Send author notifications
  for (const entry of [...thirtyDayEntries, ...sevenDayEntries]) {
    await sendAuthorReminder(entry);
  }
}
```

### Weather API Integration

**OpenWeatherMap Free Tier:**
- 1000 API calls/day
- Current weather by coordinates

```javascript
async function getWeather(lat: number, lng: number) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=imperial`
  );
  const data = await response.json();

  return {
    condition: data.weather[0].main,
    temp_f: Math.round(data.main.temp),
    icon: data.weather[0].icon
  };
}
```

### Markdown Rendering

**Client-Side:** react-markdown with plugins

```javascript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    // Custom renderers for checkboxes, highlights, etc.
  }}
>
  {content}
</ReactMarkdown>
```

**Server-Side:** Pre-render to HTML on save for public pages

---

## Development Phases

### Phase 1: Foundation (Week 1)

- [ ] **1.1** Create database migrations for all journal tables
- [ ] **1.2** Set up RLS policies for journal tables
- [ ] **1.3** Create TypeScript types in shared-types package
- [ ] **1.4** Add journal API routes (CRUD for entries)
- [ ] **1.5** Add shared-api client methods for journal
- [ ] **1.6** Create React Query hooks for journal data

### Phase 2: Core Editor (Week 2)

- [ ] **2.1** Build entry creation page with mode selection
- [ ] **2.2** Implement markdown editor with formatting toolbar
- [ ] **2.3** Add photo/video upload with drag-drop support
- [ ] **2.4** Build Instagram-style media grid component
- [ ] **2.5** Implement mood selector UI
- [ ] **2.6** Add metadata capture (date, time, location)

### Phase 3: Organization & Views (Week 3)

- [ ] **3.1** Build journal entry list view (timeline)
- [ ] **3.2** Build single entry detail view
- [ ] **3.3** Implement tag system with filtering
- [ ] **3.4** Add search functionality
- [ ] **3.5** Build calendar view
- [ ] **3.6** Implement "On This Day" feature

### Phase 4: Sharing & Public Pages (Week 4)

- [ ] **4.1** Build public entry page (unauthenticated view)
- [ ] **4.2** Implement share settings modal
- [ ] **4.3** Add password protection for shared entries
- [ ] **4.4** Create share link generation and copy
- [ ] **4.5** Build QR code generation for links
- [ ] **4.6** Add public page SEO meta tags

### Phase 5: Time Capsule (Week 5)

- [ ] **5.1** Build recipient management UI
- [ ] **5.2** Create time capsule assignment modal
- [ ] **5.3** Implement delivery date selection
- [ ] **5.4** Set up cron job for capsule delivery
- [ ] **5.5** Create time capsule email template
- [ ] **5.6** Implement author reminder system
- [ ] **5.7** Build capsule management view (edit/cancel)

### Phase 6: Prompts & Polish (Week 6)

- [ ] **6.1** Seed database with curated prompts
- [ ] **6.2** Implement AI prompt generation
- [ ] **6.3** Build custom prompt creation
- [ ] **6.4** Add weather API integration
- [ ] **6.5** Mobile responsive polish
- [ ] **6.6** Performance optimization (lazy loading, virtualization)
- [ ] **6.7** Add entry export (PDF, JSON)

---

## Future Enhancements

**Not in MVP, but potential future features:**

| Feature | Description | Effort |
|---------|-------------|--------|
| Book Printing | Export journal as physical printed book | High |
| Voice Entries | Record audio, transcribe to text | Medium |
| Collaborative Journals | Shared journals with family | High |
| Daily Writing Streaks | Gamification with streak tracking | Low |
| AI Summarization | Monthly/yearly AI-generated summaries | Medium |
| Native Mobile App | React Native via Expo | High |
| End-to-End Encryption | Client-side encryption option | High |
| Import from Day One | Migration tool for Day One exports | Medium |
| Apple Watch Quick Entry | Capture via watch | Medium |
| Siri/Google Assistant | Voice-activated entry creation | Medium |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Entry creation time | < 30 seconds | Analytics |
| Daily active journalers | 50% of users | DAU/MAU |
| Photos per entry (avg) | 2+ | Database query |
| Time capsules created | 10% of entries | Database query |
| Public shares | 5% of entries | Database query |
| User retention (30-day) | 40% | Cohort analysis |

---

## Appendix: Day One Feature Comparison

| Feature | Day One | Singularity Journal | Notes |
|---------|---------|---------------------|-------|
| Free-form entries | ✅ | ✅ | |
| Guided prompts | ✅ | ✅ | |
| Photos (30/entry) | ✅ Premium | ✅ | |
| Videos | ✅ Premium | ✅ | |
| Markdown | ✅ | ✅ | Simplified |
| Location | ✅ | ✅ | |
| Weather | ✅ | ✅ | Via OpenWeatherMap |
| Mood tracking | ❌ | ✅ | Added feature |
| Tags | ✅ | ✅ | |
| Multiple journals | ✅ | Via tags | Simplified |
| On This Day | ✅ | ✅ | |
| Public sharing | ✅ (deprecated?) | ✅ | |
| Password protection | ❌ | ✅ | Added feature |
| Time capsule | ❌ | ✅ | **Unique feature** |
| Book printing | ✅ | Future | |
| End-to-end encryption | ✅ | Future | |

---

*Document maintained by the Singularity development team.*
