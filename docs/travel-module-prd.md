# Travel Module PRD & Implementation Plan

**Version:** 1.0
**Date:** January 2026
**Status:** Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Model](#data-model)
3. [Implementation Phases](#implementation-phases)
4. [Phase 1: Core Trip CRUD](#phase-1-core-trip-crud)
5. [Phase 2: Segments & Accommodations](#phase-2-segments--accommodations)
6. [Phase 3: Days & Activities](#phase-3-days--activities)
7. [Phase 4: Media Upload](#phase-4-media-upload)
8. [Phase 5: Google Calendar Integration](#phase-5-google-calendar-integration)
9. [Phase 6: Sharing & Export](#phase-6-sharing--export)
10. [API Endpoints](#api-endpoints)
11. [UI Components](#ui-components)
12. [Test Coverage Matrix](#test-coverage-matrix)

---

## Executive Summary

The Travel Module enables users to plan, organize, and share trip itineraries with a **three-level hierarchical structure**:

1. **Trip Level** - High-level overview (dates, transportation, destinations)
2. **Segment Level** - Regional groupings (e.g., "Algarve, Days 9-18")
3. **Day/Activity Level** - Granular hourly scheduling

### Key Features
- Three-level collapsible view (glance → daily → hourly)
- Transportation details (flying vs driving)
- Accommodation tracking
- Media attachments (reuse Journal pattern)
- Google Calendar sync (reuse existing integration)
- Family sharing

---

## Data Model

### Table: `trips`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, DEFAULT uuid_generate_v4() | Primary key |
| `user_id` | uuid | FK users.id, NOT NULL | Owner |
| `name` | varchar(255) | NOT NULL | "Portugal Family Road Trip 2026" |
| `description` | text | | Trip overview |
| `start_date` | date | NOT NULL | Trip start |
| `end_date` | date | NOT NULL | Trip end |
| `origin` | varchar(255) | | "Los Angeles, CA" |
| `destination` | varchar(255) | | "Lisbon, Portugal" |
| `transportation_type` | varchar(20) | CHECK IN ('flying', 'driving', 'both') | Primary transport |
| `cover_image_url` | text | | Hero image URL |
| `traveler_count` | int | DEFAULT 1 | Number of travelers |
| `budget_estimate` | jsonb | | {total, accommodation, transport, activities, food} |
| `packing_checklist` | jsonb | | Array of {item, checked, category} |
| `status` | varchar(20) | DEFAULT 'planning' | planning, confirmed, in_progress, completed |
| `is_public` | boolean | DEFAULT false | Public sharing |
| `public_slug` | varchar(100) | UNIQUE | URL slug for sharing |
| `share_password_hash` | text | | Optional password protection |
| `notes` | text | | General notes |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### Table: `trip_flights`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `direction` | varchar(20) | CHECK IN ('outbound', 'return') | Flight direction |
| `airline` | varchar(100) | | "United Airlines" |
| `flight_number` | varchar(20) | | "UA 123" |
| `departure_airport` | varchar(10) | | "LAX" |
| `arrival_airport` | varchar(10) | | "LIS" |
| `departure_datetime` | timestamptz | | Full timestamp |
| `arrival_datetime` | timestamptz | | Full timestamp |
| `booking_reference` | varchar(50) | | Confirmation code |
| `seat_assignments` | jsonb | | [{name, seat}] |
| `layovers` | jsonb | | [{airport, duration, flight_number}] |
| `notes` | text | | |
| `created_at` | timestamptz | DEFAULT now() | |

### Table: `trip_driving`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `rental_company` | varchar(100) | | "Hertz" |
| `vehicle_type` | varchar(50) | | "SUV" |
| `pickup_location` | varchar(255) | | "Lisbon Airport" |
| `dropoff_location` | varchar(255) | | "Lisbon Airport" |
| `pickup_datetime` | timestamptz | | |
| `dropoff_datetime` | timestamptz | | |
| `booking_reference` | varchar(50) | | |
| `total_distance_km` | int | | 1200 |
| `fuel_estimate` | decimal(10,2) | | 200.00 |
| `toll_estimate` | decimal(10,2) | | 150.00 |
| `daily_rate` | decimal(10,2) | | |
| `insurance_included` | boolean | DEFAULT false | |
| `notes` | text | | |
| `created_at` | timestamptz | DEFAULT now() | |

### Table: `trip_segments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `name` | varchar(255) | NOT NULL | "Lagos/Sagres (Algarve)" |
| `description` | text | | Segment overview |
| `start_date` | date | NOT NULL | |
| `end_date` | date | NOT NULL | |
| `location_name` | varchar(255) | | "Lagos, Portugal" |
| `latitude` | decimal(10,7) | | 37.1020 |
| `longitude` | decimal(10,7) | | -8.6730 |
| `cover_image_url` | text | | Region photo |
| `city_info` | jsonb | | {history, culture, tips, overview} |
| `key_activities_summary` | text | | "Dramatic sea cliffs, surfing..." |
| `driving_from_previous` | varchar(100) | | "3 hrs from Cascais" |
| `driving_notes` | text | | Route tips |
| `sort_order` | int | DEFAULT 0 | |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### Table: `trip_accommodations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `segment_id` | uuid | FK trip_segments.id ON DELETE SET NULL | Optional link to segment |
| `name` | varchar(255) | NOT NULL | "Hyatt Regency Lisbon" |
| `address` | text | | Full address |
| `latitude` | decimal(10,7) | | |
| `longitude` | decimal(10,7) | | |
| `check_in_date` | date | NOT NULL | |
| `check_out_date` | date | NOT NULL | |
| `check_in_time` | time | DEFAULT '15:00' | |
| `check_out_time` | time | DEFAULT '11:00' | |
| `nights` | int | | Auto-calculated |
| `room_type` | varchar(100) | | "1,065 sq ft Suite" |
| `cost` | decimal(10,2) | | 0 if using points |
| `currency` | varchar(3) | DEFAULT 'USD' | |
| `points_used` | int | | 90000 |
| `loyalty_program` | varchar(50) | | "World of Hyatt" |
| `booking_reference` | varchar(50) | | |
| `amenities` | jsonb | | ["pool", "breakfast", "parking"] |
| `website` | text | | |
| `phone` | varchar(30) | | |
| `notes` | text | | "River views, kids check-in" |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### Table: `trip_days`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `segment_id` | uuid | FK trip_segments.id ON DELETE SET NULL | Parent segment |
| `date` | date | NOT NULL | |
| `day_number` | int | | 1-30 within trip |
| `title` | varchar(255) | | "Arrival & Belém Exploration" |
| `overview` | text | | Day summary |
| `weather_high_c` | int | | 28 |
| `weather_low_c` | int | | 18 |
| `weather_conditions` | varchar(100) | | "Sunny, UV 8, light breeze" |
| `photo_opportunities` | jsonb | | [{location, description, best_time}] |
| `notes` | text | | |
| `sort_order` | int | DEFAULT 0 | |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### Table: `trip_activities`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `day_id` | uuid | FK trip_days.id ON DELETE CASCADE | Parent day |
| `name` | varchar(255) | NOT NULL | "Pastéis de Belém" |
| `description` | text | | What to do/see |
| `activity_type` | varchar(30) | | hike, beach, restaurant, museum, transport, activity |
| `time_block` | varchar(20) | | morning, midday, sunset, evening |
| `start_time` | time | | 09:00 |
| `end_time` | time | | 10:30 |
| `location_name` | varchar(255) | | "Pastéis de Belém" |
| `address` | text | | Full address |
| `latitude` | decimal(10,7) | | |
| `longitude` | decimal(10,7) | | |
| `google_maps_url` | text | | |
| `why_its_great` | text | | Why this activity is special |
| `kid_friendliness` | text | | Kid-specific notes |
| `gear_prep` | text | | What to bring |
| `cost_estimate` | decimal(10,2) | | |
| `cost_currency` | varchar(3) | DEFAULT 'USD' | |
| `website` | text | | |
| `phone` | varchar(30) | | |
| `reservation_required` | boolean | DEFAULT false | |
| `reservation_details` | text | | Confirmation info |
| `is_backup` | boolean | DEFAULT false | Alternate activity |
| `alltrails_url` | text | | For hikes |
| `alltrails_rating` | decimal(2,1) | | 4.5 |
| `alltrails_review_summary` | text | | |
| `activity_details` | jsonb | | Type-specific fields |
| `tips` | text | | Pro tips |
| `notes` | text | | |
| `sort_order` | int | DEFAULT 0 | |
| `calendar_event_id` | varchar(255) | | Google Calendar event ID |
| `created_at` | timestamptz | DEFAULT now() | |
| `updated_at` | timestamptz | DEFAULT now() | |

### Table: `trip_media`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | Parent trip |
| `parent_type` | varchar(20) | NOT NULL | trip, segment, day, activity, accommodation |
| `parent_id` | uuid | NOT NULL | ID of parent entity |
| `file_url` | text | NOT NULL | Supabase storage URL |
| `thumbnail_url` | text | | For videos |
| `media_type` | varchar(10) | | image, video |
| `original_filename` | varchar(255) | | |
| `mime_type` | varchar(50) | | |
| `file_size_bytes` | bigint | | |
| `width` | int | | |
| `height` | int | | |
| `caption` | text | | |
| `sort_order` | int | DEFAULT 0 | |
| `created_at` | timestamptz | DEFAULT now() | |

### Table: `trip_sharing`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK | Primary key |
| `trip_id` | uuid | FK trips.id ON DELETE CASCADE | |
| `shared_with_user_id` | uuid | FK users.id ON DELETE CASCADE | |
| `permission` | varchar(20) | DEFAULT 'view' | view, edit |
| `created_at` | timestamptz | DEFAULT now() | |
| UNIQUE(trip_id, shared_with_user_id) | | | |

---

## Implementation Phases

### Phase Overview

| Phase | Feature | Duration | Dependencies |
|-------|---------|----------|--------------|
| 1 | Core Trip CRUD | - | None |
| 2 | Segments & Accommodations | - | Phase 1 |
| 3 | Days & Activities | - | Phase 2 |
| 4 | Media Upload | - | Phase 3 |
| 5 | Google Calendar Integration | - | Phase 3 |
| 6 | Sharing & Export | - | Phase 4 |

---

## Phase 1: Core Trip CRUD

### Scope
- Create `trips`, `trip_flights`, `trip_driving` tables
- Basic CRUD API endpoints
- Trip list page
- Trip create/edit modal
- Trip detail page (shell)

### Database Migration: `018_trips_core.sql`

```sql
-- Trip tables
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  origin varchar(255),
  destination varchar(255),
  transportation_type varchar(20) CHECK (transportation_type IN ('flying', 'driving', 'both')),
  cover_image_url text,
  traveler_count int DEFAULT 1,
  budget_estimate jsonb,
  packing_checklist jsonb,
  status varchar(20) DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed')),
  is_public boolean DEFAULT false,
  public_slug varchar(100) UNIQUE,
  share_password_hash text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_flights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  direction varchar(20) CHECK (direction IN ('outbound', 'return')),
  airline varchar(100),
  flight_number varchar(20),
  departure_airport varchar(10),
  arrival_airport varchar(10),
  departure_datetime timestamptz,
  arrival_datetime timestamptz,
  booking_reference varchar(50),
  seat_assignments jsonb,
  layovers jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_driving (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  rental_company varchar(100),
  vehicle_type varchar(50),
  pickup_location varchar(255),
  dropoff_location varchar(255),
  pickup_datetime timestamptz,
  dropoff_datetime timestamptz,
  booking_reference varchar(50),
  total_distance_km int,
  fuel_estimate decimal(10,2),
  toll_estimate decimal(10,2),
  daily_rate decimal(10,2),
  insurance_included boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_driving ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trips" ON trips
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own trip flights" ON trip_flights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_flights.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Users can CRUD own trip driving" ON trip_driving
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_driving.trip_id AND trips.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX idx_trip_flights_trip_id ON trip_flights(trip_id);
CREATE INDEX idx_trip_driving_trip_id ON trip_driving(trip_id);

-- Trigger for updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### API Endpoints

```typescript
// POST /api/v1/trips - Create trip
// GET /api/v1/trips - List user's trips
// GET /api/v1/trips/:id - Get trip with transportation
// PUT /api/v1/trips/:id - Update trip
// DELETE /api/v1/trips/:id - Delete trip

// POST /api/v1/trips/:id/flights - Add flight
// PUT /api/v1/trips/:id/flights/:flightId - Update flight
// DELETE /api/v1/trips/:id/flights/:flightId - Delete flight

// POST /api/v1/trips/:id/driving - Add driving details
// PUT /api/v1/trips/:id/driving/:drivingId - Update driving
// DELETE /api/v1/trips/:id/driving/:drivingId - Delete driving
```

### UI Components

1. **Trip List Page** (`/travel`)
   - Grid of trip cards with cover images
   - Status badges (planning, confirmed, completed)
   - Quick stats (days, locations)
   - "Add Trip" button

2. **Trip Create/Edit Modal**
   - Name, description, dates
   - Origin/destination
   - Transportation type selector (flying/driving/both)
   - Conditional forms for flight/driving details
   - Traveler count
   - Cover image upload (Phase 4)

3. **Trip Detail Page** (`/travel/[id]`)
   - Hero with cover image
   - Trip info card
   - Transportation summary
   - Segments list (Phase 2)
   - Tabs: Overview | Itinerary | Accommodations | Budget

### Acceptance Criteria

- [ ] User can create a new trip with name, dates, origin/destination
- [ ] User can select transportation type and fill relevant details
- [ ] User can view list of all their trips
- [ ] User can edit existing trip details
- [ ] User can delete a trip (with confirmation)
- [ ] Trip cards show key info (name, dates, status, destination)
- [ ] Flight details include airline, times, airports, booking reference
- [ ] Driving details include rental company, vehicle, pickup/dropoff

---

## Phase 2: Segments & Accommodations

### Scope
- Create `trip_segments`, `trip_accommodations` tables
- CRUD endpoints for segments and accommodations
- Segment list in trip detail
- Segment create/edit modal with city info
- Accommodation cards

### Database Migration: `019_trip_segments.sql`

```sql
CREATE TABLE IF NOT EXISTS trip_segments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  location_name varchar(255),
  latitude decimal(10,7),
  longitude decimal(10,7),
  cover_image_url text,
  city_info jsonb,
  key_activities_summary text,
  driving_from_previous varchar(100),
  driving_notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_accommodations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES trip_segments(id) ON DELETE SET NULL,
  name varchar(255) NOT NULL,
  address text,
  latitude decimal(10,7),
  longitude decimal(10,7),
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  check_in_time time DEFAULT '15:00',
  check_out_time time DEFAULT '11:00',
  nights int,
  room_type varchar(100),
  cost decimal(10,2),
  currency varchar(3) DEFAULT 'USD',
  points_used int,
  loyalty_program varchar(50),
  booking_reference varchar(50),
  amenities jsonb,
  website text,
  phone varchar(30),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE trip_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip segments" ON trip_segments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Users can CRUD own trip accommodations" ON trip_accommodations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_accommodations.trip_id AND trips.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_trip_segments_trip_id ON trip_segments(trip_id);
CREATE INDEX idx_trip_segments_dates ON trip_segments(start_date, end_date);
CREATE INDEX idx_trip_accommodations_trip_id ON trip_accommodations(trip_id);
CREATE INDEX idx_trip_accommodations_segment_id ON trip_accommodations(segment_id);

-- Triggers
CREATE TRIGGER update_trip_segments_updated_at
  BEFORE UPDATE ON trip_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_accommodations_updated_at
  BEFORE UPDATE ON trip_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Acceptance Criteria

- [ ] User can add segments to a trip with name, dates, location
- [ ] User can add city info (history, culture, tips) to segments
- [ ] User can reorder segments via drag-drop
- [ ] User can edit/delete segments
- [ ] User can add accommodations linked to segments
- [ ] Accommodation shows check-in/out dates, cost or points, amenities
- [ ] Segments display in chronological order with driving time between them

---

## Phase 3: Days & Activities

### Scope
- Create `trip_days`, `trip_activities` tables
- CRUD endpoints
- Day cards within segments
- Activity detail modal
- Three-level collapsible view
- Time block organization (morning/midday/sunset/evening)

### Database Migration: `020_trip_days_activities.sql`

```sql
CREATE TABLE IF NOT EXISTS trip_days (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_id uuid REFERENCES trip_segments(id) ON DELETE SET NULL,
  date date NOT NULL,
  day_number int,
  title varchar(255),
  overview text,
  weather_high_c int,
  weather_low_c int,
  weather_conditions varchar(100),
  photo_opportunities jsonb,
  notes text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  activity_type varchar(30),
  time_block varchar(20),
  start_time time,
  end_time time,
  location_name varchar(255),
  address text,
  latitude decimal(10,7),
  longitude decimal(10,7),
  google_maps_url text,
  why_its_great text,
  kid_friendliness text,
  gear_prep text,
  cost_estimate decimal(10,2),
  cost_currency varchar(3) DEFAULT 'USD',
  website text,
  phone varchar(30),
  reservation_required boolean DEFAULT false,
  reservation_details text,
  is_backup boolean DEFAULT false,
  alltrails_url text,
  alltrails_rating decimal(2,1),
  alltrails_review_summary text,
  activity_details jsonb,
  tips text,
  notes text,
  sort_order int DEFAULT 0,
  calendar_event_id varchar(255),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip days" ON trip_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Users can CRUD own trip activities" ON trip_activities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_activities.trip_id AND trips.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX idx_trip_days_segment_id ON trip_days(segment_id);
CREATE INDEX idx_trip_days_date ON trip_days(date);
CREATE INDEX idx_trip_activities_day_id ON trip_activities(day_id);
CREATE INDEX idx_trip_activities_trip_id ON trip_activities(trip_id);
CREATE INDEX idx_trip_activities_time ON trip_activities(start_time);

-- Triggers
CREATE TRIGGER update_trip_days_updated_at
  BEFORE UPDATE ON trip_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_activities_updated_at
  BEFORE UPDATE ON trip_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Acceptance Criteria

- [ ] User can add days to a trip (auto-generates from date range option)
- [ ] Each day shows date, day number, title, weather
- [ ] User can add activities to days with full v3 format fields
- [ ] Activities organized by time blocks (morning/midday/sunset/evening)
- [ ] Three-level collapsible view works (segment → day → activity)
- [ ] Activity types include: hike, beach, restaurant, museum, transport, activity
- [ ] Backup activities marked separately and collapsible
- [ ] Hike activities show AllTrails link, rating, review summary
- [ ] Restaurant activities show hours, reservation info
- [ ] Activities can be reordered within a day

---

## Phase 4: Media Upload

### Scope
- Create `trip_media` table
- Reuse Journal media upload pattern
- Attach media to trips, segments, days, activities
- Gallery view with reordering

### Database Migration: `021_trip_media.sql`

```sql
CREATE TABLE IF NOT EXISTS trip_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  parent_type varchar(20) NOT NULL CHECK (parent_type IN ('trip', 'segment', 'day', 'activity', 'accommodation')),
  parent_id uuid NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  media_type varchar(10) CHECK (media_type IN ('image', 'video')),
  original_filename varchar(255),
  mime_type varchar(50),
  file_size_bytes bigint,
  width int,
  height int,
  caption text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE trip_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip media" ON trip_media
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_media.trip_id AND trips.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_trip_media_trip_id ON trip_media(trip_id);
CREATE INDEX idx_trip_media_parent ON trip_media(parent_type, parent_id);
```

### Acceptance Criteria

- [ ] User can upload images to trips (cover image)
- [ ] User can upload images to segments (city photos)
- [ ] User can upload images to days
- [ ] User can upload images to activities
- [ ] Images stored in Supabase Storage (`singularity-uploads/travel/`)
- [ ] Gallery view shows all media for an entity
- [ ] User can reorder media via drag-drop
- [ ] User can add captions to media
- [ ] User can delete media

---

## Phase 5: Google Calendar Integration

### Scope
- Reuse existing Google Calendar OAuth
- Add "Sync to Calendar" button on days
- Add "Sync to Calendar" button on individual activities
- Store calendar_event_id for updates

### API Endpoints

```typescript
// POST /api/v1/trips/:id/calendar/sync-day/:dayId
// POST /api/v1/trips/:id/calendar/sync-activity/:activityId
// DELETE /api/v1/trips/:id/calendar/unsync-day/:dayId
// DELETE /api/v1/trips/:id/calendar/unsync-activity/:activityId
```

### Acceptance Criteria

- [ ] User can sync entire day's activities to Google Calendar
- [ ] User can sync individual activity to Google Calendar
- [ ] Calendar events include: title, start/end time, location, description
- [ ] User can unsync (delete) calendar events
- [ ] Synced activities show calendar indicator
- [ ] Updates to activity reflect in Google Calendar

---

## Phase 6: Sharing & Export

### Scope
- Create `trip_sharing` table
- Share with family members (reuse user_links)
- Public link sharing with optional password
- Export to PDF/markdown

### Database Migration: `022_trip_sharing.sql`

```sql
CREATE TABLE IF NOT EXISTS trip_sharing (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  permission varchar(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, shared_with_user_id)
);

-- RLS
ALTER TABLE trip_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip sharing" ON trip_sharing
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_sharing.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Shared users can read sharing" ON trip_sharing
  FOR SELECT USING (shared_with_user_id = auth.uid());

-- Update trips RLS to include shared trips
DROP POLICY IF EXISTS "Users can CRUD own trips" ON trips;

CREATE POLICY "Users can read own and shared trips" ON trips
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
    OR EXISTS (SELECT 1 FROM trip_sharing WHERE trip_sharing.trip_id = trips.id AND trip_sharing.shared_with_user_id = auth.uid())
  );

CREATE POLICY "Users can modify own trips" ON trips
  FOR ALL USING (auth.uid() = user_id);
```

### Acceptance Criteria

- [ ] User can share trip with family members (via user_links)
- [ ] Shared users can view trip (view permission)
- [ ] Shared users can edit trip (edit permission)
- [ ] User can generate public link
- [ ] Public link can have optional password
- [ ] User can export trip to PDF
- [ ] User can export trip to markdown

---

## API Endpoints Summary

### Trips
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips | List user's trips |
| POST | /api/v1/trips | Create trip |
| GET | /api/v1/trips/:id | Get trip detail |
| PUT | /api/v1/trips/:id | Update trip |
| DELETE | /api/v1/trips/:id | Delete trip |

### Transportation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/trips/:id/flights | Add flight |
| PUT | /api/v1/trips/:id/flights/:fid | Update flight |
| DELETE | /api/v1/trips/:id/flights/:fid | Delete flight |
| POST | /api/v1/trips/:id/driving | Add driving |
| PUT | /api/v1/trips/:id/driving/:did | Update driving |
| DELETE | /api/v1/trips/:id/driving/:did | Delete driving |

### Segments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips/:id/segments | List segments |
| POST | /api/v1/trips/:id/segments | Create segment |
| PUT | /api/v1/trips/:id/segments/:sid | Update segment |
| DELETE | /api/v1/trips/:id/segments/:sid | Delete segment |
| POST | /api/v1/trips/:id/segments/reorder | Reorder segments |

### Accommodations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips/:id/accommodations | List accommodations |
| POST | /api/v1/trips/:id/accommodations | Create accommodation |
| PUT | /api/v1/trips/:id/accommodations/:aid | Update |
| DELETE | /api/v1/trips/:id/accommodations/:aid | Delete |

### Days
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips/:id/days | List days |
| POST | /api/v1/trips/:id/days | Create day |
| POST | /api/v1/trips/:id/days/generate | Auto-generate from date range |
| PUT | /api/v1/trips/:id/days/:did | Update day |
| DELETE | /api/v1/trips/:id/days/:did | Delete day |

### Activities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips/:id/activities | List all activities |
| GET | /api/v1/trips/:id/days/:did/activities | List day's activities |
| POST | /api/v1/trips/:id/days/:did/activities | Create activity |
| PUT | /api/v1/trips/:id/activities/:aid | Update activity |
| DELETE | /api/v1/trips/:id/activities/:aid | Delete activity |
| POST | /api/v1/trips/:id/activities/reorder | Reorder activities |

### Media
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips/:id/media | List all trip media |
| POST | /api/v1/trips/:id/media | Upload media |
| PUT | /api/v1/trips/:id/media/:mid | Update caption/order |
| DELETE | /api/v1/trips/:id/media/:mid | Delete media |
| POST | /api/v1/trips/:id/media/reorder | Reorder media |

### Calendar Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/trips/:id/calendar/sync-day/:did | Sync day to calendar |
| POST | /api/v1/trips/:id/calendar/sync-activity/:aid | Sync activity |
| DELETE | /api/v1/trips/:id/calendar/unsync-day/:did | Remove day from calendar |
| DELETE | /api/v1/trips/:id/calendar/unsync-activity/:aid | Remove activity |

### Sharing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/trips/:id/sharing | Get sharing settings |
| POST | /api/v1/trips/:id/sharing | Share with user |
| DELETE | /api/v1/trips/:id/sharing/:uid | Remove sharing |
| PUT | /api/v1/trips/:id/public | Update public settings |
| GET | /api/v1/trips/public/:slug | Get public trip |

---

## UI Components

### Pages

1. `/travel` - Trip list
2. `/travel/new` - Create trip
3. `/travel/[id]` - Trip detail (with tabs)
4. `/travel/[id]/edit` - Edit trip
5. `/travel/[id]/day/[dayId]` - Day detail (optional, can be modal)
6. `/travel/public/[slug]` - Public trip view

### Components

1. `TripCard` - Card for trip list
2. `TripCreateModal` - Create/edit trip form
3. `FlightForm` - Flight details form
4. `DrivingForm` - Driving details form
5. `SegmentCard` - Collapsible segment
6. `SegmentEditModal` - Edit segment with city info
7. `AccommodationCard` - Hotel card
8. `AccommodationEditModal` - Edit accommodation
9. `DayCard` - Collapsible day card
10. `DayEditModal` - Edit day details
11. `ActivityCard` - Activity in timeline
12. `ActivityDetailModal` - Full activity details
13. `ActivityEditModal` - Edit activity (v3 format)
14. `TimeBlockSection` - Morning/Midday/Sunset grouping
15. `TripMediaGallery` - Photo gallery
16. `TripMediaUpload` - Upload component
17. `TripShareSettings` - Sharing configuration
18. `CalendarSyncButton` - Sync to Google Calendar

---

## Test Coverage Matrix

| Phase | Test File | Tests |
|-------|-----------|-------|
| 1 | `travel-trips-crud.spec.ts` | Create, Read, Update, Delete trips |
| 1 | `travel-transportation.spec.ts` | Add/edit flights, driving details |
| 2 | `travel-segments.spec.ts` | CRUD segments, city info, reorder |
| 2 | `travel-accommodations.spec.ts` | CRUD accommodations |
| 3 | `travel-days.spec.ts` | CRUD days, auto-generate |
| 3 | `travel-activities.spec.ts` | CRUD activities, time blocks, reorder |
| 3 | `travel-collapsible-view.spec.ts` | Three-level expand/collapse |
| 4 | `travel-media.spec.ts` | Upload, gallery, reorder, delete |
| 5 | `travel-calendar-sync.spec.ts` | Sync day/activity to calendar |
| 6 | `travel-sharing.spec.ts` | Share with users, public link |

---

## Change Log

### v1.0 (January 2026)
- Initial PRD created
- Defined all 6 phases
- Complete data model
- API endpoint specification
- Test coverage matrix
