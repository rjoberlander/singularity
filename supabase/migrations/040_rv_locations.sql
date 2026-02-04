-- RV Locations Module
-- Standalone RV camping destinations with flat structure (Location > Activities)
-- Unlike travel (Trip > Segment > Day > Activity), RV Locations are standalone

-- =============================================
-- RV LOCATIONS (Main Table)
-- =============================================
CREATE TABLE IF NOT EXISTS rv_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  hook TEXT,  -- 1-2 sentence compelling reason ("The Hook")

  -- Category
  category VARCHAR(50) CHECK (category IN (
    'harvest_hosts', 'national_parks', 'state_parks', 'hot_springs',
    'lake_river', 'boondocking', 'couples_getaway', 'other'
  )),

  -- Location
  location_name VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  -- Google Places data
  google_place_id VARCHAR(255),
  google_rating DECIMAL(2,1),
  google_review_count INTEGER,
  google_price_level INTEGER,  -- 1-4 ($ to $$$$)

  -- RV Logistics
  rv_logistics JSONB,  -- {max_trailer_length_ft, hookups, road_accessibility, cell_coverage, starlink_friendly, dump_station, fifth_wheel_accessible}

  -- Reservation
  reservation_required BOOLEAN DEFAULT false,
  reservation_url TEXT,
  reservation_notes TEXT,

  -- Cost
  cost_per_night DECIMAL(10,2),
  cost_currency VARCHAR(3) DEFAULT 'USD',
  cost_notes TEXT,

  -- Best Season
  best_season JSONB,  -- {best: [], avoid: [], notes}

  -- Distance
  drive_time_from_la VARCHAR(100),
  drive_distance_miles INTEGER,

  -- Vibe (1-5 ratings)
  vibe JSONB,  -- {solitude_level, other_kids_around, relaxation_factor, scenic_beauty, adventure_level, family_friendly}

  -- Educational Value
  educational_value JSONB,  -- {visitor_center, junior_ranger_program, ranger_programs, topics}

  -- Kid Engagement
  kid_engagement JSONB,  -- {parker: {suitable, engagement_level, activities}, charlotte: {...}, xander: {...}}

  -- Contact
  website TEXT,
  phone VARCHAR(30),

  -- Cover Image
  cover_image_url TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'researching' CHECK (status IN ('researching', 'want_to_visit', 'visited', 'not_interested')),
  priority INTEGER DEFAULT 0,

  -- Tags
  tags TEXT[],

  -- Pros/Cons
  pros TEXT[],
  cons TEXT[],

  -- Notes
  notes TEXT,

  -- Trip Conversion
  converted_to_trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rv_locations
CREATE INDEX IF NOT EXISTS idx_rv_locations_user_id ON rv_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_rv_locations_category ON rv_locations(category);
CREATE INDEX IF NOT EXISTS idx_rv_locations_status ON rv_locations(status);
CREATE INDEX IF NOT EXISTS idx_rv_locations_state ON rv_locations(state);
CREATE INDEX IF NOT EXISTS idx_rv_locations_priority ON rv_locations(user_id, priority);

-- Enable RLS
ALTER TABLE rv_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rv_locations
CREATE POLICY "Users can read own rv_locations" ON rv_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rv_locations" ON rv_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rv_locations" ON rv_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rv_locations" ON rv_locations
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RV LOCATION ACTIVITIES
-- =============================================
CREATE TABLE IF NOT EXISTS rv_location_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES rv_locations(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type
  activity_type VARCHAR(30) CHECK (activity_type IN (
    'hike', 'bike', 'swim', 'fish', 'kayak', 'paddleboard', 'horseback',
    'wildlife_viewing', 'stargazing', 'hot_springs', 'beach', 'playground',
    'visitor_center', 'ranger_program', 'scenic_drive', 'photography', 'other'
  )),

  -- Timing
  time_of_day VARCHAR(20) CHECK (time_of_day IN ('morning', 'midday', 'afternoon', 'evening', 'any')),

  -- Kid Engagement
  kid_engagement JSONB,  -- Same structure as parent

  -- Duration
  duration_minutes INTEGER,
  duration_text VARCHAR(50),

  -- Location
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  distance_from_campsite VARCHAR(100),  -- "5 min drive"

  -- Cost
  cost_estimate DECIMAL(10,2),
  cost_notes TEXT,

  -- Google Places
  google_place_id VARCHAR(255),
  google_rating DECIMAL(2,1),

  -- AllTrails (for hikes)
  alltrails_url TEXT,
  alltrails_rating DECIMAL(2,1),
  difficulty VARCHAR(20),
  distance_miles DECIMAL(5,2),
  elevation_gain_ft INTEGER,

  -- Tips/Notes
  tips TEXT,
  notes TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rv_location_activities_location_id ON rv_location_activities(location_id);
CREATE INDEX IF NOT EXISTS idx_rv_location_activities_type ON rv_location_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_rv_location_activities_sort ON rv_location_activities(location_id, sort_order);

-- Enable RLS
ALTER TABLE rv_location_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own rv_location_activities" ON rv_location_activities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM rv_locations WHERE rv_locations.id = rv_location_activities.location_id AND rv_locations.user_id = auth.uid())
  );

-- =============================================
-- RV LOCATION MEDIA
-- =============================================
CREATE TABLE IF NOT EXISTS rv_location_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES rv_locations(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES rv_location_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Media Info
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),

  -- File Info
  original_filename VARCHAR(255),
  mime_type VARCHAR(50),
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,

  -- Caption
  caption TEXT,

  -- Google attribution (for photos fetched from Google Places)
  google_attribution_name VARCHAR(255),
  google_attribution_uri TEXT,
  is_google_sourced BOOLEAN DEFAULT false,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rv_location_media_location_id ON rv_location_media(location_id);
CREATE INDEX IF NOT EXISTS idx_rv_location_media_activity_id ON rv_location_media(activity_id);
CREATE INDEX IF NOT EXISTS idx_rv_location_media_user_id ON rv_location_media(user_id);

-- Enable RLS
ALTER TABLE rv_location_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own rv_location_media" ON rv_location_media
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read shared rv_location_media" ON rv_location_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rv_locations
      WHERE rv_locations.id = rv_location_media.location_id
      AND rv_locations.user_id = auth.uid()
    )
  );

-- =============================================
-- RV RESEARCH SETTINGS
-- =============================================
CREATE TABLE IF NOT EXISTS rv_research_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Claude Instructions for RV research
  claude_instructions TEXT,

  -- Family Profile
  family_profile JSONB,  -- {members: [{name, age, engagement_style}], equipment: {...}}

  -- Output Template
  output_template JSONB,  -- Expected output format

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rv_research_settings_user_id ON rv_research_settings(user_id);

-- Enable RLS
ALTER TABLE rv_research_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own rv_research_settings" ON rv_research_settings
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_rv_locations_updated_at BEFORE UPDATE ON rv_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rv_location_activities_updated_at BEFORE UPDATE ON rv_location_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rv_research_settings_updated_at BEFORE UPDATE ON rv_research_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
