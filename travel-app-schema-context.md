# Singularity App - Database Schema & Data Structures

> **Note:** This codebase is **Singularity**, a health optimization and personal tracking app. While it includes location-aware journaling, there is **no dedicated travel planning module**. This document provides a comprehensive overview of the existing data model for AI/developer context.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Tables](#database-tables)
3. [TypeScript Interfaces](#typescript-interfaces)
4. [API Endpoints](#api-endpoints)
5. [React Query Hooks](#react-query-hooks)
6. [Data Flow](#data-flow)
7. [Location & Travel-Related Features](#location--travel-related-features)
8. [Incomplete/In-Progress Features](#incompletein-progress-features)

---

## Architecture Overview

### Tech Stack
- **Database:** Supabase (PostgreSQL)
- **Backend:** Express.js API (`apps/api/`)
- **Frontend:** Next.js web app (`apps/web/`) + React Native mobile (`apps/mobile/`)
- **Shared Code:**
  - `packages/shared-types/` - TypeScript interfaces
  - `packages/shared-api/` - API client & React Query hooks
- **Auth:** Supabase Auth with Row Level Security (RLS)

### Project Structure
```
singularity/
├── apps/
│   ├── api/           # Express backend
│   ├── web/           # Next.js frontend
│   └── mobile/        # React Native app
├── packages/
│   ├── shared-types/  # TypeScript interfaces
│   └── shared-api/    # API client & hooks
└── supabase/
    └── migrations/    # 20 SQL migration files
```

---

## Database Tables

### Core User Tables

#### `users`
Primary user accounts (linked to Supabase Auth).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `email` | TEXT | Unique email address |
| `name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile image URL |
| `role` | TEXT | `'owner'` or `'member'` |
| `is_active` | BOOLEAN | Account status |
| `onboarding_completed` | BOOLEAN | Has completed onboarding |
| `onboarding_step` | TEXT | Current onboarding step |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `user_links`
Family/spouse sharing with permission levels.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `owner_user` | UUID | Account owner |
| `linked_user` | UUID | Linked account |
| `permission` | TEXT | `'read'`, `'write'`, `'admin'` |
| `status` | TEXT | `'pending'`, `'active'`, `'revoked'` |
| `invite_code` | TEXT | Unique invite code |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### Health Tracking Tables

#### `biomarkers`
Lab results and health metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Biomarker name (e.g., "HDL", "Vitamin D") |
| `category` | TEXT | Category (e.g., "Lipid Panel", "Metabolic") |
| `value` | DECIMAL | Measured value |
| `unit` | TEXT | Unit of measurement |
| `date_tested` | DATE | Test date |
| `lab_source` | TEXT | Lab name |
| `reference_range_low` | DECIMAL | Lab reference range low |
| `reference_range_high` | DECIMAL | Lab reference range high |
| `optimal_range_low` | DECIMAL | Optimal range low |
| `optimal_range_high` | DECIMAL | Optimal range high |
| `notes` | TEXT | Additional notes |
| `source_image` | TEXT | Source image URL |
| `ai_extracted` | BOOLEAN | Extracted by AI |
| `is_calculated` | BOOLEAN | Calculated value (e.g., LDL from Friedewald) |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `biomarker_stars`
Starred/favorite biomarkers for quick access.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `biomarker_name` | TEXT | Biomarker name |
| `starred_at` | TIMESTAMPTZ | When starred |
| `starred_by` | TEXT | `'user'` or `'ai'` |
| `ai_reason` | TEXT | Why AI starred it |

#### `biomarker_notes`
Notes on specific biomarkers (user or AI-generated).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `biomarker_name` | TEXT | Biomarker name |
| `content` | TEXT | Note content |
| `created_by` | TEXT | `'user'` or `'ai'` |
| `ai_context` | TEXT | Context for AI note |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

---

### Supplement & Protocol Tables

#### `supplements`
Supplement/vitamin tracking with detailed protocol info.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Supplement name |
| `brand` | TEXT | Brand name |
| `intake_quantity` | INTEGER | Units per dose |
| `intake_form` | TEXT | Form (pill, capsule, powder, etc.) |
| `serving_size` | INTEGER | Units per serving |
| `dose_per_serving` | DECIMAL | Amount per serving |
| `dose_unit` | TEXT | Unit (mg, g, mcg, IU, ml, CFU, %) |
| `servings_per_container` | INTEGER | Total servings |
| `price` | DECIMAL | Purchase price |
| `price_per_serving` | DECIMAL | Calculated cost per serving |
| `purchase_url` | TEXT | Where to buy |
| `category` | TEXT | Category |
| `timing` | TEXT | When to take (deprecated, use timings) |
| `timings` | TEXT[] | Array: `wake_up`, `am`, `lunch`, `pm`, `dinner`, `before_bed`, `specific` |
| `timing_specific` | TEXT | HH:MM if timing = 'specific' |
| `timing_reason` | TEXT | Why at this time |
| `reason` | TEXT | Why taking this supplement |
| `mechanism` | TEXT | How it works |
| `frequency` | TEXT | `'daily'`, `'every_other_day'`, `'custom'`, `'as_needed'` |
| `frequency_days` | TEXT[] | Days for custom frequency |
| `is_active` | BOOLEAN | Currently taking |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `equipment`
Health devices and equipment.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Device name |
| `brand` | TEXT | Brand |
| `model` | TEXT | Model number |
| `category` | TEXT | `'LLLT'`, `'microneedling'`, `'sleep'`, `'skincare'`, `'recovery'` |
| `purpose` | TEXT | What it's for |
| `specs` | JSONB | Flexible specs (e.g., `{"wavelength": "660nm"}`) |
| `usage_frequency` | TEXT | How often used |
| `usage_timing` | TEXT | When to use |
| `usage_duration` | TEXT | Duration per session |
| `usage_protocol` | TEXT | Detailed protocol |
| `contraindications` | TEXT | Warnings/conflicts |
| `purchase_date` | DATE | When purchased |
| `purchase_price` | DECIMAL | Price |
| `purchase_url` | TEXT | Where to buy |
| `warranty_expiry` | DATE | Warranty end date |
| `is_active` | BOOLEAN | Currently using |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `facial_products`
Skincare routine products.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Product name |
| `brand` | TEXT | Brand |
| `step_order` | INTEGER | Order in routine |
| `application_form` | TEXT | cream, gel, serum, etc. |
| `application_amount` | TEXT | "pea-sized", "2-3 drops" |
| `application_area` | TEXT | full_face, under_eyes, t_zone, etc. |
| `application_method` | TEXT | pat, massage, apply |
| `routines` | TEXT[] | `['am']`, `['pm']`, or both |
| `usage_amount` | DECIMAL | Amount per application |
| `usage_unit` | TEXT | ml, pumps, drops |
| `size_amount` | DECIMAL | Container size |
| `size_unit` | TEXT | ml, oz, g |
| `price` | DECIMAL | Price |
| `purchase_url` | TEXT | Where to buy |
| `category` | TEXT | cleanser, toner, serum, moisturizer, sunscreen, etc. |
| `subcategory` | TEXT | retinoid, vitamin_c, niacinamide, aha, bha, etc. |
| `key_ingredients` | TEXT[] | Active ingredients |
| `spf_rating` | INTEGER | SPF (for sunscreens) |
| `purpose` | TEXT | Why using |
| `notes` | TEXT | Additional notes |
| `is_active` | BOOLEAN | Currently using |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

---

### Schedule & Routine Tables

#### `schedule_items`
Exercises and meals scheduling.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `item_type` | TEXT | `'exercise'` or `'meal'` |
| `name` | TEXT | Item name |
| `timing` | TEXT | `wake_up`, `am`, `lunch`, `pm`, `dinner`, `evening`, `bed` |
| `frequency` | TEXT | `'daily'`, `'every_other_day'`, `'custom'`, `'as_needed'` |
| `frequency_days` | TEXT[] | Days for custom frequency |
| `exercise_type` | TEXT | `hiit`, `run`, `bike`, `swim`, `strength`, `yoga`, `walk`, `stretch`, `sports`, `other` |
| `meal_type` | TEXT | `meal`, `protein_shake`, `snack` |
| `duration` | TEXT | Duration (for exercises) |
| `is_active` | BOOLEAN | Currently active |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `user_diet`
User's diet type and macros.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (unique) |
| `diet_type` | TEXT | `untracked`, `standard`, `keto`, `carnivore`, `vegan`, `vegetarian`, `mediterranean`, `paleo`, `low_fodmap`, `other` |
| `diet_type_other` | TEXT | Custom name if 'other' |
| `target_protein_g` | INTEGER | Daily protein target |
| `target_carbs_g` | INTEGER | Daily carbs target |
| `target_fat_g` | INTEGER | Daily fat target |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `routines`
Named routine containers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Routine name |
| `time_of_day` | TEXT | Morning, evening, etc. |
| `sort_order` | INTEGER | Display order |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `routine_items`
Individual items within a routine.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `routine_id` | UUID | Parent routine |
| `title` | TEXT | Item title |
| `description` | TEXT | Description |
| `time` | TEXT | Specific time |
| `duration` | TEXT | Duration |
| `days` | JSONB | Days of week |
| `linked_supplement` | UUID | Optional linked supplement |
| `sort_order` | INTEGER | Display order |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `routine_versions`
Snapshot-based change tracking for protocols.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `version_number` | INTEGER | Sequential version number |
| `snapshot` | JSONB | Full state snapshot (see RoutineSnapshot interface) |
| `changes` | JSONB | Diff from previous version (see RoutineChanges interface) |
| `reason` | TEXT | User-provided reason for change |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### Goals & Change Log

#### `goals`
Health goals with target biomarkers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `title` | TEXT | Goal title |
| `category` | TEXT | Category |
| `target_biomarker` | TEXT | Target biomarker name |
| `current_value` | DECIMAL | Current value |
| `target_value` | DECIMAL | Target value |
| `direction` | TEXT | `'increase'`, `'decrease'`, `'maintain'` |
| `status` | TEXT | `'active'`, `'achieved'`, `'paused'` |
| `priority` | INTEGER | Priority level |
| `notes` | TEXT | Additional notes |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `goal_interventions`
Interventions linked to goals.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `goal_id` | UUID | Parent goal |
| `intervention` | TEXT | Intervention description |
| `type` | TEXT | Intervention type |
| `status` | TEXT | Status |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `change_log`
Protocol change history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `date` | TIMESTAMPTZ | Change date |
| `change_type` | TEXT | `'started'`, `'stopped'`, `'modified'` |
| `item_type` | TEXT | What was changed |
| `item_name` | TEXT | Name of item |
| `previous_value` | TEXT | Old value |
| `new_value` | TEXT | New value |
| `reason` | TEXT | Why changed |
| `linked_concern` | TEXT | Related health concern |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### Journal Tables (Location-Aware)

#### `journal_entries`
Day One-style journal with location & weather tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `title` | TEXT | Entry title |
| `content` | TEXT | Entry content (required) |
| `content_html` | TEXT | Pre-rendered HTML |
| `entry_date` | DATE | Entry date |
| `entry_time` | TIME | Entry time |
| **`location_name`** | TEXT | **Location name (e.g., "San Francisco, CA")** |
| **`location_lat`** | DECIMAL(10,8) | **Latitude** |
| **`location_lng`** | DECIMAL(11,8) | **Longitude** |
| `weather_condition` | TEXT | Weather (e.g., "Partly Cloudy") |
| `weather_temp_f` | INTEGER | Temperature in Fahrenheit |
| `weather_icon` | TEXT | Weather icon code |
| `mood` | TEXT | `happy`, `calm`, `neutral`, `sad`, `down`, `frustrated` |
| `mood_custom` | TEXT | Custom mood text |
| `tags` | TEXT[] | Array of tags (e.g., `['travel', 'family']`) |
| `entry_mode` | TEXT | `'freeform'` or `'guided'` |
| `prompt_used` | TEXT | Prompt if guided mode |
| `is_public` | BOOLEAN | Publicly shareable |
| `public_slug` | TEXT | Custom URL slug |
| `share_password` | TEXT | Optional password protection |
| `show_author` | BOOLEAN | Show author on public |
| `show_location` | BOOLEAN | Show location on public |
| `show_date` | BOOLEAN | Show date on public |
| `is_time_capsule` | BOOLEAN | Time capsule entry |
| `capsule_delivery_date` | DATE | When to deliver capsule |
| `capsule_delivered` | BOOLEAN | Has been delivered |
| `capsule_reminder_30d_sent` | BOOLEAN | 30-day reminder sent |
| `capsule_reminder_7d_sent` | BOOLEAN | 7-day reminder sent |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `journal_media`
Photos/videos attached to journal entries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `entry_id` | UUID | Parent entry |
| `user_id` | UUID | Owner |
| `media_type` | TEXT | `'image'` or `'video'` |
| `file_url` | TEXT | Supabase Storage URL |
| `thumbnail_url` | TEXT | Thumbnail (for videos) |
| `width` | INTEGER | Media width |
| `height` | INTEGER | Media height |
| `duration_seconds` | INTEGER | Video duration |
| `file_size_bytes` | BIGINT | File size |
| `sort_order` | INTEGER | Display order |
| `original_filename` | TEXT | Original filename |
| `mime_type` | TEXT | MIME type |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `journal_recipients`
Recipients for time capsule feature.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Recipient name |
| `relationship` | TEXT | "Daughter", "Son", "Friend", etc. |
| `email` | TEXT | Email address |
| `phone` | TEXT | Phone number |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `journal_capsule_recipients`
Junction table linking entries to recipients.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `entry_id` | UUID | Journal entry |
| `recipient_id` | UUID | Recipient |
| `delivered_at` | TIMESTAMPTZ | Delivery timestamp |
| `delivery_email` | TEXT | Email used at delivery |
| `created_at` | TIMESTAMPTZ | Created timestamp |

#### `journal_prompts`
Writing prompts (curated, AI, or user-created).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `prompt_text` | TEXT | The prompt question |
| `category` | TEXT | gratitude, reflection, memory, mood, etc. |
| `source` | TEXT | `'curated'`, `'ai'`, `'user'` |
| `user_id` | UUID | Owner (for user prompts) |
| `is_active` | BOOLEAN | Currently active |
| `times_used` | INTEGER | Usage count |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### Sleep Tracking Tables (Eight Sleep Integration)

#### `eight_sleep_integrations`
Eight Sleep device credentials and settings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (unique) |
| `email_encrypted` | TEXT | Encrypted Eight Sleep email |
| `password_encrypted` | TEXT | Encrypted password |
| `eight_sleep_user_id` | TEXT | Eight Sleep account ID |
| `session_token_encrypted` | TEXT | Encrypted session token |
| `token_expires_at` | TIMESTAMPTZ | Token expiration |
| `device_id` | TEXT | Device ID |
| `side` | TEXT | `'left'`, `'right'`, `'solo'` |
| `sync_enabled` | BOOLEAN | Auto-sync enabled |
| `sync_time` | TIME | Daily sync time |
| `sync_timezone` | TEXT | User timezone |
| `is_active` | BOOLEAN | Integration active |
| `last_sync_at` | TIMESTAMPTZ | Last sync timestamp |
| `last_sync_status` | TEXT | `'success'`, `'failed'`, `'syncing'`, `'never'` |
| `consecutive_failures` | INTEGER | Failure count |
| `last_error_message` | TEXT | Last error |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `sleep_sessions`
Nightly sleep data from Eight Sleep.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `integration_id` | UUID | Eight Sleep integration |
| `date` | DATE | Sleep date (unique per user) |
| `sleep_score` | INTEGER | Overall score (0-100) |
| `sleep_quality_score` | INTEGER | Quality score |
| `time_slept` | INTEGER | Minutes slept |
| `time_to_fall_asleep` | INTEGER | Minutes to fall asleep |
| `time_in_bed` | INTEGER | Total minutes in bed |
| `wake_events` | INTEGER | Number of wake events |
| `wake_event_times` | JSONB | Array of wake times |
| `woke_between_2_and_4_am` | BOOLEAN | Cortisol wake flag |
| `wake_time_between_2_and_4_am` | TIME | Wake time if between 2-4am |
| `avg_heart_rate` | DECIMAL | Average heart rate |
| `min_heart_rate` | DECIMAL | Minimum heart rate |
| `max_heart_rate` | DECIMAL | Maximum heart rate |
| `avg_hrv` | DECIMAL | Average HRV |
| `min_hrv` | DECIMAL | Minimum HRV |
| `max_hrv` | DECIMAL | Maximum HRV |
| `avg_breathing_rate` | DECIMAL | Average breathing rate |
| `light_sleep_minutes` | INTEGER | Light sleep duration |
| `deep_sleep_minutes` | INTEGER | Deep sleep duration |
| `rem_sleep_minutes` | INTEGER | REM sleep duration |
| `awake_minutes` | INTEGER | Time awake |
| `light_sleep_pct` | DECIMAL | Light sleep percentage |
| `deep_sleep_pct` | DECIMAL | Deep sleep percentage |
| `rem_sleep_pct` | DECIMAL | REM sleep percentage |
| `awake_pct` | DECIMAL | Awake percentage |
| `avg_bed_temp` | DECIMAL | Average bed temperature |
| `avg_room_temp` | DECIMAL | Average room temperature |
| `sleep_start_time` | TIMESTAMPTZ | Sleep start time |
| `sleep_end_time` | TIMESTAMPTZ | Sleep end time |
| `toss_and_turn_count` | INTEGER | Tossing count |
| `raw_data` | JSONB | Full API response |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `sleep_protocol_correlation`
Links sleep sessions to supplements taken that day.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `sleep_session_id` | UUID | Sleep session |
| `user_id` | UUID | Owner |
| `date` | DATE | Date |
| `supplements_taken` | JSONB | Array of supplements |
| `routine_items_completed` | JSONB | Array of routines |
| `biomarkers_recorded` | JSONB | Array of biomarkers |
| `notes` | TEXT | User notes |
| `alcohol_consumed` | BOOLEAN | Alcohol flag |
| `caffeine_after_noon` | BOOLEAN | Late caffeine flag |
| `exercise_that_day` | BOOLEAN | Exercise flag |
| `high_stress_day` | BOOLEAN | Stress flag |
| `created_at` | TIMESTAMPTZ | Created timestamp |

---

### Other Tables

#### `ai_conversations`
AI chat history for data extraction.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `context` | TEXT | Conversation context |
| `biomarker_name` | TEXT | Related biomarker |
| `title` | TEXT | Conversation title |
| `messages` | JSONB | Array of messages |
| `extracted_data` | JSONB | Extracted structured data |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

#### `protocol_docs`
Knowledge base documents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `title` | TEXT | Document title |
| `content` | TEXT | Document content |
| `category` | TEXT | `routine`, `biomarkers`, `supplements`, `goals`, `reference`, `other` |
| `file_url` | TEXT | Attached file URL |
| `created_at` | TIMESTAMPTZ | Created timestamp |
| `updated_at` | TIMESTAMPTZ | Last updated |

---

## TypeScript Interfaces

All types are exported from `packages/shared-types/src/index.ts`.

### Key Interfaces

```typescript
// User types
interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "owner" | "member";
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Supplement timing
type SupplementTiming = 'wake_up' | 'am' | 'lunch' | 'pm' | 'dinner' | 'before_bed' | 'specific';
type SupplementFrequency = 'daily' | 'every_other_day' | 'custom' | 'as_needed';
type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

// Supplement form options
type SupplementIntakeForm =
  | 'pill' | 'capsule' | 'softgel' | 'tablet'
  | 'scoop' | 'dropper' | 'drop' | 'spray'
  | 'gummy' | 'lozenge' | 'chewable'
  | 'packet' | 'teaspoon' | 'tablespoon'
  | 'patch' | 'powder';

type SupplementDoseUnit = 'mg' | 'g' | 'mcg' | 'IU' | 'ml' | 'CFU' | '%';

// Journal types
type JournalMood = 'happy' | 'calm' | 'neutral' | 'sad' | 'down' | 'frustrated';
type JournalEntryMode = 'freeform' | 'guided';
type JournalMediaType = 'image' | 'video';

interface JournalEntry {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  content_html?: string;
  entry_date: string;
  entry_time?: string;
  location_name?: string;    // "San Francisco, CA"
  location_lat?: number;      // Latitude
  location_lng?: number;      // Longitude
  weather_condition?: string;
  weather_temp_f?: number;
  weather_icon?: string;
  mood?: JournalMood | string;
  mood_custom?: string;
  tags: string[];
  entry_mode: JournalEntryMode;
  prompt_used?: string;
  is_public: boolean;
  public_slug?: string;
  share_password?: string;
  show_author: boolean;
  show_location: boolean;
  show_date: boolean;
  is_time_capsule: boolean;
  capsule_delivery_date?: string;
  capsule_delivered: boolean;
  media?: JournalMedia[];
  capsule_recipients?: JournalCapsuleRecipient[];
  created_at: string;
  updated_at: string;
}

// Schedule types
type ExerciseType = 'hiit' | 'run' | 'bike' | 'swim' | 'strength' | 'yoga' | 'walk' | 'stretch' | 'sports' | 'other';
type MealType = 'meal' | 'protein_shake' | 'snack';
type DietType = 'untracked' | 'standard' | 'keto' | 'carnivore' | 'vegan' | 'vegetarian' | 'mediterranean' | 'paleo' | 'low_fodmap' | 'other';

// Routine versioning
interface RoutineSnapshot {
  diet: {
    type: DietType;
    type_other: string | null;
    macros: {
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
    };
  };
  items: RoutineSnapshotItem[];
}

interface RoutineChanges {
  diet_changed: { from: string; to: string } | null;
  macros_changed: Record<string, { from: number | null; to: number | null }> | null;
  started: RoutineSnapshotItem[];
  stopped: RoutineSnapshotItem[];
  modified: Array<{
    item: RoutineSnapshotItem;
    changes: Array<{ field: string; from: unknown; to: unknown }>;
  }>;
}
```

---

## API Endpoints

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://api.singularity.app/api`

### Endpoints by Module

#### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/session` - Get current session

#### Biomarkers
- `GET /biomarkers` - List all biomarkers
- `GET /biomarkers/:id` - Get single biomarker
- `GET /biomarkers/history/:name` - Get history for a biomarker
- `POST /biomarkers` - Create biomarker
- `POST /biomarkers/bulk` - Create multiple biomarkers
- `PUT /biomarkers/:id` - Update biomarker
- `DELETE /biomarkers/:id` - Delete biomarker
- `DELETE /biomarkers/bulk` - Delete multiple biomarkers

#### Supplements
- `GET /supplements` - List supplements
- `GET /supplements/:id` - Get single supplement
- `POST /supplements` - Create supplement
- `POST /supplements/bulk` - Create multiple
- `PUT /supplements/:id` - Update supplement
- `PUT /supplements/:id/toggle` - Toggle active status
- `DELETE /supplements/:id` - Delete supplement

#### Equipment
- `GET /equipment` - List equipment
- `GET /equipment/:id` - Get single item
- `GET /equipment/duplicates` - Find duplicates
- `POST /equipment` - Create equipment
- `POST /equipment/bulk` - Create multiple
- `PUT /equipment/:id` - Update equipment
- `PUT /equipment/:id/toggle` - Toggle active status
- `DELETE /equipment/:id` - Delete equipment

#### Journal
- `GET /journal` - List entries
- `GET /journal/:id` - Get single entry
- `GET /journal/on-this-day` - Get entries from same date in past years
- `GET /journal/tags` - Get all tags with counts
- `POST /journal` - Create entry
- `PUT /journal/:id` - Update entry
- `DELETE /journal/:id` - Delete entry
- `POST /journal/:id/media` - Add media
- `DELETE /journal/:id/media/:mediaId` - Delete media
- `PUT /journal/:id/media/reorder` - Reorder media
- `PUT /journal/:id/share` - Update share settings
- `DELETE /journal/:id/share` - Revoke sharing
- `POST /journal/:id/capsule` - Assign time capsule
- `DELETE /journal/:id/capsule` - Cancel time capsule
- `GET /journal/recipients` - List recipients
- `POST /journal/recipients` - Create recipient
- `PUT /journal/recipients/:id` - Update recipient
- `DELETE /journal/recipients/:id` - Delete recipient
- `GET /journal/prompts/random` - Get random prompt
- `GET /journal/prompts/mine` - Get user's prompts
- `POST /journal/prompts` - Create prompt
- `DELETE /journal/prompts/:id` - Delete prompt

#### Schedule & Diet
- `GET /schedule-items` - List items
- `GET /schedule-items/:id` - Get single item
- `POST /schedule-items` - Create item
- `PUT /schedule-items/:id` - Update item
- `PUT /schedule-items/:id/toggle` - Toggle active
- `DELETE /schedule-items/:id` - Delete item
- `GET /user-diet` - Get user diet
- `PUT /user-diet` - Update user diet

#### Routine Versions
- `GET /routine-versions` - List versions
- `GET /routine-versions/:id` - Get single version
- `GET /routine-versions/latest` - Get latest version
- `GET /routine-versions/current-snapshot` - Get current state
- `POST /routine-versions` - Save new version

#### AI
- `POST /ai/extract-biomarkers` - Extract from image/text
- `POST /ai/extract-supplements` - Extract supplements
- `POST /ai/extract-equipment` - Extract equipment
- `POST /ai/analyze-trend` - Analyze biomarker trend
- `POST /ai/protocol-analysis` - Analyze protocol
- `POST /ai/chat` - Chat with AI

---

## React Query Hooks

Located in `packages/shared-api/src/hooks.ts`.

### Example Usage

```typescript
import {
  useJournalEntries,
  useCreateJournalEntry,
  useSupplements,
  useBiomarkers
} from '@singularity/shared-api';

// List journal entries with filters
const { data: entries } = useJournalEntries({
  tag: 'travel',
  mood: 'happy',
  limit: 20
});

// Create new entry
const { mutate: createEntry } = useCreateJournalEntry();
createEntry({
  content: "Great day hiking!",
  location_name: "Yosemite National Park",
  location_lat: 37.8651,
  location_lng: -119.5383,
  tags: ['travel', 'hiking'],
  mood: 'happy'
});

// Get supplements
const { data: supplements } = useSupplements({ is_active: true });

// Get biomarkers
const { data: biomarkers } = useBiomarkers({ category: 'Lipid Panel' });
```

---

## Data Flow

### Creating Data
1. User interacts with frontend (web/mobile)
2. Frontend calls hook (e.g., `useCreateJournalEntry`)
3. Hook calls API client function
4. API client sends request to Express backend
5. Backend validates request and user auth
6. Backend inserts into Supabase (RLS enforced)
7. Response returns through chain
8. React Query invalidates relevant cache

### Reading Data
1. Component uses hook (e.g., `useJournalEntries`)
2. React Query checks cache
3. If stale/missing, calls API
4. Supabase RLS ensures user can only see own data (or shared)
5. Data cached and returned

### AI Extraction Flow
1. User uploads image or pastes text
2. Frontend calls `useExtractBiomarkers` or similar
3. Backend sends to Claude API with structured extraction prompt
4. Claude returns structured JSON
5. User reviews extracted data in UI
6. User confirms → data saved to database

---

## Location & Travel-Related Features

While there's no dedicated travel module, the **Journal** has location tracking:

### Current Capabilities
- **Location name** (text): "San Francisco, CA"
- **Coordinates**: Latitude/Longitude (DECIMAL precision)
- **Weather**: Condition, temperature, icon
- **Tags**: Can include `#travel`, `#vacation`, etc.
- **Media**: Photos/videos with dimensions and ordering
- **Public sharing**: Shareable links with optional password

### What's Missing for True Travel App
- No **Trips** entity (grouping entries by trip)
- No **Itineraries** or **Segments** (flights, hotels, activities)
- No **Destinations** master list
- No **Day planning** structure
- No **Booking integration**
- No **Collaborative trip planning**
- No **Maps visualization** of travel history

---

## Incomplete/In-Progress Features

Based on codebase analysis:

1. **Google Calendar OAuth** - Schema exists (`014_google_calendar_oauth.sql`) but integration appears incomplete

2. **Oura/Whoop/Garmin** - `sync_schedules` table supports multiple integration types but only Eight Sleep is implemented

3. **AI-Generated Notes** - Infrastructure exists for AI biomarker notes but AI generation flow may be incomplete

4. **Time Capsule Delivery** - Schema supports email delivery but actual email sending may not be implemented

5. **Public Journal Sharing** - Schema supports it but frontend implementation unclear

6. **Facial Product Usage Tracking** - Usage per application fields exist but tracking system incomplete

---

## Database Helper Functions

### Sleep Analysis
```sql
-- Get sleep analysis summary
SELECT * FROM get_sleep_analysis('user-uuid', 30);

-- Compare sleep by supplement protocol
SELECT * FROM compare_sleep_by_protocol('user-uuid', 90);
```

---

## Row Level Security (RLS)

All tables have RLS enabled with consistent patterns:

1. **Own data**: Users can always read/write their own data
2. **Linked users**: Some tables allow read access for family members via `user_links`
3. **Public data**: Journal entries with `is_public = true` are readable by anyone

Example policy:
```sql
CREATE POLICY "Users can read own journal entries" ON journal_entries
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM user_links
      WHERE linked_user = auth.uid()
      AND owner_user = journal_entries.user_id
      AND status = 'active'
    )
  );
```

---

## Notes for AI Developers

1. **All UUIDs**: Primary keys are UUIDs (`gen_random_uuid()`)
2. **Timestamps**: Use `TIMESTAMPTZ` with `NOW()` defaults
3. **Arrays**: PostgreSQL native arrays (`TEXT[]`) for tags, timings, etc.
4. **JSON**: `JSONB` for flexible structured data (specs, snapshots)
5. **Soft deletes**: Not used - records are actually deleted
6. **Cascading deletes**: All foreign keys use `ON DELETE CASCADE`
7. **Updated triggers**: `update_updated_at_column()` trigger on most tables
