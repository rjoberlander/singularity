-- Migration: 022_travel_research_and_settings.sql
-- Description: Add travel settings table and research items table for the trip import workflow
--
-- WORKFLOW OVERVIEW (see docs/travel-module-prd.md for full documentation):
--   1. User maintains Family Profile and Claude Instructions in travel_settings
--   2. User researches in Claude.ai with deep research mode
--   3. Claude outputs segment-X-research.json files
--   4. User imports JSON via /travel/import -> creates trip_research_items
--   5. User reviews/approves items in the app
--   6. Approved items can be imported as trip_activities
--
-- This migration enables the scaffolding workflow: Research → Review → Expand → Import

-- ============================================================================
-- TRAVEL SETTINGS TABLE
-- Stores user-specific travel configuration: Claude instructions, family profile, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS travel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Claude Project Instructions (SYSTEM-INSTRUCTIONS.md content)
  -- This is what gets pasted into Claude's Project Instructions
  claude_instructions TEXT,
  claude_instructions_version VARCHAR(20) DEFAULT '1.0',

  -- Family Travel Profile (family-travel-profile.json content)
  -- Stored as JSONB for structured queries if needed
  family_profile JSONB,
  family_profile_version VARCHAR(20) DEFAULT '1.0',

  -- Output Template (research-output-template.json content)
  -- Reference template for Claude's JSON output structure
  output_template JSONB,
  output_template_version VARCHAR(20) DEFAULT '1.0',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_travel_settings_user ON travel_settings(user_id);

-- RLS
ALTER TABLE travel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own travel settings"
  ON travel_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_travel_settings_updated_at BEFORE UPDATE ON travel_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE travel_settings IS
'User-specific travel planning configuration including Claude instructions, family profile, and output template.
Part of the trip import workflow - see docs/travel-module-prd.md for details.';

-- ============================================================================
-- RESEARCH ITEMS TABLE
-- Stores discovered items BEFORE they become activities
-- This enables the scaffolding workflow: Research → Review → Expand → Import
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_research_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES trip_segments(id) ON DELETE SET NULL,

  -- ========================================
  -- CLASSIFICATION
  -- ========================================
  item_type VARCHAR(30) NOT NULL CHECK (item_type IN (
    'restaurant', 'hike', 'attraction', 'beach', 'hotel',
    'activity', 'shop', 'service', 'viewpoint', 'transport'
  )),
  category VARCHAR(50),  -- 'must_see', 'morning_activity', 'lunch_option', 'dinner_option', 'backup', 'day_trip', 'snack_stop'

  -- ========================================
  -- CORE INFO
  -- ========================================
  name VARCHAR(255) NOT NULL,
  description TEXT,
  why_relevant JSONB,  -- {for_family: "", unique_value: ""} - Why this item matters for THIS family

  -- ========================================
  -- SOURCE TRACKING (THE KEY FEATURE)
  -- This is what enables later expansion without re-research
  -- ========================================
  source_url TEXT,                    -- Primary URL where this was found
  source_name VARCHAR(100),           -- 'AllTrails', 'TripAdvisor', 'Google', 'Official', 'Blog'
  source_date DATE DEFAULT CURRENT_DATE,  -- When source was accessed
  additional_sources JSONB,           -- [{url, name, notes}] for items found in multiple places

  -- ========================================
  -- LOCATION
  -- ========================================
  location_name VARCHAR(255),
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  google_maps_url TEXT,
  google_place_id VARCHAR(255),

  -- ========================================
  -- QUALITY SIGNALS
  -- ========================================
  rating DECIMAL(2,1),
  review_count INTEGER,
  review_summary JSONB,              -- {positive, negative, family_specific}
  price_level INTEGER CHECK (price_level >= 1 AND price_level <= 4),

  -- ========================================
  -- FAMILY-SPECIFIC (v2 - detailed per-age assessment)
  -- ========================================
  kid_friendly BOOLEAN,
  kid_assessment JSONB,              -- {age_7: {suitable, engagement_level, notes}, age_5: {...}, age_3: {..., carrier_needed, stroller_works}, challenges: [], tips: []}
  min_age INTEGER,                   -- Minimum recommended age
  stroller_friendly BOOLEAN,

  -- ========================================
  -- PRACTICAL INFO (v2 - enhanced)
  -- ========================================
  hours_text TEXT,                   -- Human-readable hours
  hours_structured JSONB,            -- {mon, tue, wed, thu, fri, sat, sun, notes}
  cost_estimate_text TEXT,           -- "€10 adults, free under 12"
  cost_estimate_value DECIMAL(10,2), -- Representative cost for family
  cost_currency VARCHAR(3) DEFAULT 'EUR',
  cost_breakdown JSONB,              -- {adult, child_7, child_5, child_3, family_total}
  reservation_required BOOLEAN,
  reservation_details TEXT,          -- How far ahead, where to book
  booking_url TEXT,
  website TEXT,
  phone VARCHAR(30),
  time_needed JSONB,                 -- {minimum, recommended, with_kids}
  best_times JSONB,                  -- {ideal, avoid, why}

  -- ========================================
  -- TYPE-SPECIFIC FIELDS (v2 - stored as JSONB for flexibility)
  -- ========================================

  -- Hike details: {alltrails_url, distance_km, elevation_gain_m, difficulty, trail_type, surface, shaded, shade_percentage, water_available, restrooms, parking, highlights[], kid_challenges}
  hike_details JSONB,

  -- Restaurant details: {cuisine_type, signature_dishes[{name, description, price, kid_friendly}], ambience, noise_level, seating, highchair, kids_menu, dietary_options[], reservation_tips}
  restaurant_details JSONB,

  -- Beach details: {water_conditions, sand_type, facilities[], parking, crowds, shade_available, food_nearby}
  beach_details JSONB,

  -- ========================================
  -- HISTORICAL/WHAT TO SEE (v2 - enhanced)
  -- ========================================
  historical_context JSONB,          -- {summary, significance, connections}
  what_to_see JSONB,                 -- [{name, description, location_hint, dont_miss, kid_interest}]

  -- ========================================
  -- RAW DATA BLOB
  -- For anything that doesn't fit structured fields
  -- ========================================
  raw_data JSONB,

  -- ========================================
  -- WORKFLOW STATUS
  -- ========================================
  status VARCHAR(20) DEFAULT 'unprocessed' CHECK (status IN (
    'unprocessed',  -- Just imported from research
    'reviewing',    -- Currently being reviewed
    'approved',     -- Approved, ready for expansion
    'expanded',     -- Deep content added
    'imported',     -- Converted to activity
    'rejected',     -- Won't use
    'deferred'      -- Maybe later
  )),

  priority VARCHAR(20) CHECK (priority IN (
    'must_do', 'recommended', 'optional', 'backup', 'if_time'
  )),

  -- ========================================
  -- DAY ASSIGNMENT (PRE-IMPORT)
  -- ========================================
  assigned_day INTEGER,              -- Which day number (1, 2, 3...)
  assigned_time_block VARCHAR(20) CHECK (assigned_time_block IN (
    'morning', 'midday', 'sunset', 'evening'
  )),
  assigned_date DATE,                -- Actual date if known

  -- ========================================
  -- IMPORT TRACKING
  -- ========================================
  imported_to_activity_id UUID REFERENCES trip_activities(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ,
  import_notes TEXT,                 -- Any notes from the import process

  -- ========================================
  -- EXPANSION FIELDS (Phase 2 - populated by Claude API)
  -- These are generated when user clicks "Expand" button
  -- ========================================
  expanded_at TIMESTAMPTZ,
  expanded_by VARCHAR(50),           -- 'claude-api', 'manual'
  deep_dive_content TEXT,            -- 500-1000 word tour-guide narrative
  kid_engagement JSONB,              -- {age_7: [], age_5: [], age_3: [], conversation_starters: [], games: []}
  visit_script JSONB,                -- {arrival, flow, highlight_moments: [], exit_strategy}
  photo_guide JSONB,                 -- [{shot, where, when, how, with_kids}]
  practical_details_extended JSONB,  -- {insider_tips: [], warnings: [], money_saving: [], with_stroller, bathroom_locations, food_nearby, rest_spots}

  -- ========================================
  -- USER NOTES
  -- ========================================
  notes TEXT,
  tags TEXT[],                       -- User-defined tags for filtering

  -- ========================================
  -- TIMESTAMPS
  -- ========================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR RESEARCH ITEMS
-- ============================================================================

-- Primary access patterns
CREATE INDEX idx_research_items_trip ON trip_research_items(trip_id);
CREATE INDEX idx_research_items_segment ON trip_research_items(segment_id);
CREATE INDEX idx_research_items_status ON trip_research_items(status);
CREATE INDEX idx_research_items_type ON trip_research_items(item_type);
CREATE INDEX idx_research_items_priority ON trip_research_items(priority);

-- For filtering unprocessed items
CREATE INDEX idx_research_items_workflow ON trip_research_items(trip_id, status, priority);

-- For day assignment view
CREATE INDEX idx_research_items_day ON trip_research_items(trip_id, assigned_day, assigned_time_block);

-- For finding items by source (deduplication)
CREATE INDEX idx_research_items_source ON trip_research_items(source_url);

-- Full-text search on name and description
CREATE INDEX idx_research_items_search ON trip_research_items
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ============================================================================
-- ROW LEVEL SECURITY FOR RESEARCH ITEMS
-- ============================================================================

ALTER TABLE trip_research_items ENABLE ROW LEVEL SECURITY;

-- Users can see research items for trips they own or have access to
CREATE POLICY "Users can view research items for accessible trips"
  ON trip_research_items FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_sharing WHERE shared_with_user_id = auth.uid()
    )
  );

-- Users can insert research items for trips they own
CREATE POLICY "Users can insert research items for owned trips"
  ON trip_research_items FOR INSERT
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Users can update research items for trips they own or have edit access
CREATE POLICY "Users can update research items for editable trips"
  ON trip_research_items FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_sharing
      WHERE shared_with_user_id = auth.uid() AND permission = 'edit'
    )
  );

-- Users can delete research items for trips they own
CREATE POLICY "Users can delete research items for owned trips"
  ON trip_research_items FOR DELETE
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE TRIGGER trigger_update_research_item_timestamp
  BEFORE UPDATE ON trip_research_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Import research item to activity
-- Converts an approved research item into a trip_activity
-- ============================================================================

CREATE OR REPLACE FUNCTION import_research_item_to_activity(
  p_research_item_id UUID,
  p_day_id UUID
) RETURNS UUID AS $$
DECLARE
  v_research_item trip_research_items%ROWTYPE;
  v_activity_id UUID;
BEGIN
  -- Get the research item
  SELECT * INTO v_research_item
  FROM trip_research_items
  WHERE id = p_research_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Research item not found';
  END IF;

  -- Create the activity
  INSERT INTO trip_activities (
    trip_id,
    day_id,
    name,
    description,
    activity_type,
    time_block,
    location_name,
    address,
    latitude,
    longitude,
    google_maps_url,
    google_place_id,
    why_its_great,
    kid_friendliness,
    cost_estimate,
    cost_currency,
    website,
    booking_url,
    phone,
    reservation_required,
    alltrails_url,
    alltrails_rating,
    alltrails_review_summary,
    google_rating,
    google_review_count,
    google_price_level,
    deep_dive_content,
    kid_engagement,
    historical_context,
    architecture_notes,
    what_to_see,
    accessibility_info,
    priority,
    notes
  ) VALUES (
    v_research_item.trip_id,
    p_day_id,
    v_research_item.name,
    v_research_item.description,
    v_research_item.item_type,
    v_research_item.assigned_time_block,
    v_research_item.location_name,
    v_research_item.address,
    v_research_item.latitude,
    v_research_item.longitude,
    v_research_item.google_maps_url,
    v_research_item.google_place_id,
    v_research_item.why_relevant,
    v_research_item.kid_notes,
    v_research_item.cost_estimate_value,
    v_research_item.cost_currency,
    v_research_item.website,
    v_research_item.booking_url,
    v_research_item.phone,
    v_research_item.reservation_required,
    v_research_item.alltrails_url,
    v_research_item.rating,
    v_research_item.review_summary,
    v_research_item.rating,
    v_research_item.review_count,
    v_research_item.price_level,
    v_research_item.deep_dive_content,
    v_research_item.kid_engagement,
    v_research_item.historical_context,
    v_research_item.architecture_notes,
    v_research_item.what_to_see,
    jsonb_build_object('stroller_friendly', v_research_item.stroller_friendly),
    v_research_item.priority,
    v_research_item.notes
  ) RETURNING id INTO v_activity_id;

  -- Update the research item
  UPDATE trip_research_items
  SET
    status = 'imported',
    imported_to_activity_id = v_activity_id,
    imported_at = NOW()
  WHERE id = p_research_item_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Research items with segment info
-- ============================================================================

CREATE OR REPLACE VIEW research_items_with_segment AS
SELECT
  ri.*,
  ts.name as segment_name,
  ts.start_date as segment_start_date,
  ts.end_date as segment_end_date,
  ts.location_name as segment_location
FROM trip_research_items ri
LEFT JOIN trip_segments ts ON ri.segment_id = ts.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE trip_research_items IS
'Stores research findings before they become activities. Enables the scaffolding workflow where Claude does deep research, outputs structured data, user reviews/approves, then items get expanded and imported as activities. See docs/travel-module-prd.md for workflow details.';

COMMENT ON COLUMN trip_research_items.source_url IS
'Critical field: The URL where this item was discovered. Enables later expansion by fetching the source again.';

COMMENT ON COLUMN trip_research_items.why_relevant IS
'Explanation of why Claude included this in the research. Helps user understand the recommendation.';

COMMENT ON COLUMN trip_research_items.status IS
'Workflow status: unprocessed → reviewing → approved → expanded → imported (or rejected/deferred)';

COMMENT ON COLUMN trip_research_items.raw_data IS
'JSONB blob for any data that does not fit structured fields. Preserves all research even if schema does not support it.';

-- ============================================================================
-- ADD MISSING FIELDS TO TRIP_ACTIVITIES
-- These fields are referenced in import_research_item_to_activity but may be missing
-- ============================================================================

-- Google Places data fields
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1);
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_price_level INTEGER;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS booking_url TEXT;

-- Priority field
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS priority VARCHAR(20)
  CHECK (priority IN ('must_do', 'recommended', 'optional', 'backup', 'if_time'));

-- Comments for new fields
COMMENT ON COLUMN trip_activities.google_rating IS 'Google Places rating (1-5)';
COMMENT ON COLUMN trip_activities.google_review_count IS 'Number of Google reviews';
COMMENT ON COLUMN trip_activities.google_price_level IS 'Google price level (1-4)';
COMMENT ON COLUMN trip_activities.booking_url IS 'Direct booking URL';
COMMENT ON COLUMN trip_activities.priority IS 'Activity priority: must_do, recommended, optional, backup, if_time';

-- ============================================================================
-- ADD SEGMENT FIELDS FOR IMPORT
-- ============================================================================

-- Country info for segments
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);
ALTER TABLE trip_segments ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);
