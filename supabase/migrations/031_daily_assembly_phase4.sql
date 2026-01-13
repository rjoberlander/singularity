-- Migration: 031_daily_assembly_phase4.sql
-- Description: Add support for Phase 4 Daily Assembly with 15-minute precision schedules
--
-- Phase 4 Features:
-- 1. daily_schedule_items - Structured table for 15-min precision schedule entries
-- 2. Calendar sync tracking (event IDs, sync status)
-- 3. Travel time storage between locations
-- 4. Event type classification (activity, meal, transit, buffer, logistics)

-- ============================================================================
-- DAILY SCHEDULE ITEMS - 15-minute precision schedule entries
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES trip_segments(id) ON DELETE SET NULL,

  -- Timing (15-minute precision)
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (time_end - time_start)) / 60
  ) STORED,

  -- Event Classification
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN (
    'activity',    -- Main attraction/experience
    'meal',        -- Restaurant/food
    'transit',     -- Travel between locations
    'buffer',      -- Rest/flex time
    'logistics'    -- Check-in, check-out, luggage
  )),

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT,
  tips TEXT[],

  -- Location (for activity, meal, buffer)
  location_name VARCHAR(255),
  location_address TEXT,
  location_lat DECIMAL(10,7),
  location_lng DECIMAL(10,7),
  google_maps_url TEXT,

  -- Transit-specific fields
  travel_mode VARCHAR(20) CHECK (travel_mode IN ('walking', 'driving', 'transit', 'taxi', 'ferry')),
  travel_minutes INTEGER,
  travel_distance_km DECIMAL(6,2),
  travel_from_name VARCHAR(255),
  travel_from_lat DECIMAL(10,7),
  travel_from_lng DECIMAL(10,7),
  travel_to_name VARCHAR(255),
  travel_to_lat DECIMAL(10,7),
  travel_to_lng DECIMAL(10,7),
  travel_instructions TEXT,

  -- Activity linking (optional - link to research item)
  research_item_id UUID REFERENCES trip_research_items(id) ON DELETE SET NULL,

  -- Cost
  cost_estimate DECIMAL(10,2),
  cost_currency VARCHAR(3) DEFAULT 'EUR',

  -- Booking
  booking_required BOOLEAN DEFAULT FALSE,
  booking_url TEXT,
  booking_confirmation VARCHAR(100),

  -- Google Calendar sync
  calendar_title VARCHAR(255),
  calendar_description TEXT,
  calendar_location VARCHAR(500),
  calendar_event_id VARCHAR(255),
  calendar_sync_status VARCHAR(20) DEFAULT 'pending' CHECK (calendar_sync_status IN (
    'pending',     -- Not yet synced
    'synced',      -- Successfully synced
    'modified',    -- Local changes need sync
    'error',       -- Sync failed
    'deleted'      -- Marked for deletion in calendar
  )),
  calendar_synced_at TIMESTAMPTZ,
  calendar_sync_error TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_trip_id ON daily_schedule_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_day_id ON daily_schedule_items(day_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_segment_id ON daily_schedule_items(segment_id);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_time ON daily_schedule_items(time_start, time_end);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_event_type ON daily_schedule_items(event_type);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_sort ON daily_schedule_items(day_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_items_calendar_sync ON daily_schedule_items(calendar_sync_status)
  WHERE calendar_sync_status != 'synced';

-- Enable RLS
ALTER TABLE daily_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own daily schedule items" ON daily_schedule_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = daily_schedule_items.trip_id AND trips.user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_daily_schedule_items_updated_at
  BEFORE UPDATE ON daily_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIP CALENDAR SYNC - Track overall calendar sync status per trip/segment
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES trip_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Google Calendar info
  google_calendar_id VARCHAR(255),
  calendar_name VARCHAR(255),

  -- Sync status
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_full_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  total_events_synced INTEGER DEFAULT 0,

  -- Settings
  sync_activities BOOLEAN DEFAULT TRUE,
  sync_meals BOOLEAN DEFAULT TRUE,
  sync_transit BOOLEAN DEFAULT TRUE,
  sync_logistics BOOLEAN DEFAULT TRUE,
  sync_buffer BOOLEAN DEFAULT FALSE,

  -- Color coding
  color_activity VARCHAR(20) DEFAULT 'blue',
  color_meal VARCHAR(20) DEFAULT 'orange',
  color_transit VARCHAR(20) DEFAULT 'gray',
  color_logistics VARCHAR(20) DEFAULT 'purple',
  color_buffer VARCHAR(20) DEFAULT 'green',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trip_id, segment_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_calendar_sync_trip_id ON trip_calendar_sync(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_calendar_sync_user_id ON trip_calendar_sync(user_id);

-- Enable RLS
ALTER TABLE trip_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar sync" ON trip_calendar_sync
  FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_trip_calendar_sync_updated_at
  BEFORE UPDATE ON trip_calendar_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIP DAYS - Add Phase 4 assembled status tracking
-- ============================================================================

ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS assembly_status VARCHAR(20)
  DEFAULT 'not_started' CHECK (assembly_status IN (
    'not_started',   -- No Phase 4 assembly done
    'in_progress',   -- Partially assembled
    'assembled',     -- Fully assembled with 15-min schedule
    'synced'         -- Assembled and synced to calendar
  ));

ALTER TABLE trip_days ADD COLUMN IF NOT EXISTS assembly_summary JSONB;

COMMENT ON COLUMN trip_days.assembly_status IS 'Phase 4 assembly status: not_started, in_progress, assembled, synced';
COMMENT ON COLUMN trip_days.assembly_summary IS 'Phase 4 summary: {total_events, total_transit_mins, total_walking_km, earliest_start, latest_end}';

-- ============================================================================
-- TRIP SEGMENTS - Add Phase 4 hotel reference
-- ============================================================================

ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS selected_hotel_id UUID REFERENCES trip_accommodations(id) ON DELETE SET NULL;

COMMENT ON COLUMN trip_segments.selected_hotel_id IS 'Phase 4: Reference to the selected hotel for this segment (from Phase 2 hotel research)';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON daily_schedule_items TO authenticated;
GRANT ALL ON daily_schedule_items TO service_role;

GRANT ALL ON trip_calendar_sync TO authenticated;
GRANT ALL ON trip_calendar_sync TO service_role;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE daily_schedule_items IS 'Phase 4 Daily Assembly: 15-minute precision schedule items with travel times and calendar sync';
COMMENT ON TABLE trip_calendar_sync IS 'Phase 4: Google Calendar sync configuration and status per trip/segment';
