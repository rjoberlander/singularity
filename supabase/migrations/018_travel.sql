-- Singularity Travel Module
-- Trip planning with hierarchical structure: Trip > Segment > Day > Activity

-- =============================================
-- TRIPS (Main Container)
-- =============================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Origin/Destination
  origin VARCHAR(255),
  destination VARCHAR(255),

  -- Transportation
  transportation_type VARCHAR(20) CHECK (transportation_type IN ('flying', 'driving', 'both')),

  -- Cover Image
  cover_image_url TEXT,

  -- Travelers
  traveler_count INTEGER DEFAULT 1,

  -- Budget
  budget_estimate JSONB,  -- {total, accommodation, transport, activities, food}

  -- Packing
  packing_checklist JSONB,  -- [{item, checked, category}]

  -- Status
  status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'confirmed', 'in_progress', 'completed')),

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  public_slug VARCHAR(100) UNIQUE,
  share_password_hash TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trips
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_public ON trips(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_trips_public_slug ON trips(public_slug) WHERE public_slug IS NOT NULL;

-- =============================================
-- TRIP SHARING (Created early for RLS dependency)
-- =============================================
CREATE TABLE IF NOT EXISTS trip_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Permission
  permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trip_id, shared_with_user_id)
);

-- Indexes for trip_sharing
CREATE INDEX IF NOT EXISTS idx_trip_sharing_trip_id ON trip_sharing(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_sharing_user_id ON trip_sharing(shared_with_user_id);

-- =============================================
-- NOW ENABLE RLS FOR TRIPS (after trip_sharing exists)
-- =============================================
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips
CREATE POLICY "Users can read own trips" ON trips
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM trip_sharing
      WHERE trip_sharing.trip_id = trips.id
      AND trip_sharing.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RLS for trip_sharing (after trips RLS is set up)
-- =============================================
ALTER TABLE trip_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trip sharing" ON trip_sharing
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_sharing.trip_id AND trips.user_id = auth.uid())
  );

CREATE POLICY "Shared users can read sharing" ON trip_sharing
  FOR SELECT USING (shared_with_user_id = auth.uid());

-- =============================================
-- TRIP FLIGHTS
-- =============================================
CREATE TABLE IF NOT EXISTS trip_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Direction
  direction VARCHAR(20) CHECK (direction IN ('outbound', 'return')),

  -- Flight Info
  airline VARCHAR(100),
  flight_number VARCHAR(20),
  departure_airport VARCHAR(10),
  arrival_airport VARCHAR(10),
  departure_datetime TIMESTAMPTZ,
  arrival_datetime TIMESTAMPTZ,

  -- Booking
  booking_reference VARCHAR(50),
  seat_assignments JSONB,  -- [{name, seat}]

  -- Layovers
  layovers JSONB,  -- [{airport, duration, flight_number}]

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_flights_trip_id ON trip_flights(trip_id);

-- Enable RLS
ALTER TABLE trip_flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip flights" ON trip_flights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_flights.trip_id AND trips.user_id = auth.uid())
  );

-- =============================================
-- TRIP DRIVING
-- =============================================
CREATE TABLE IF NOT EXISTS trip_driving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Rental Info
  rental_company VARCHAR(100),
  vehicle_type VARCHAR(100),

  -- Pickup/Dropoff
  pickup_location VARCHAR(255),
  dropoff_location VARCHAR(255),
  pickup_datetime TIMESTAMPTZ,
  dropoff_datetime TIMESTAMPTZ,

  -- Booking
  booking_reference VARCHAR(50),

  -- Estimates
  total_distance_km INTEGER,
  fuel_estimate DECIMAL(10,2),
  toll_estimate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),

  -- Insurance
  insurance_included BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_driving_trip_id ON trip_driving(trip_id);

-- Enable RLS
ALTER TABLE trip_driving ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip driving" ON trip_driving
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_driving.trip_id AND trips.user_id = auth.uid())
  );

-- =============================================
-- TRIP SEGMENTS (High-Level Groupings)
-- =============================================
CREATE TABLE IF NOT EXISTS trip_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Location
  location_name VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  -- Cover Image
  cover_image_url TEXT,

  -- City Info (for self-guided tour)
  city_info JSONB,  -- {history, culture, tips, overview}

  -- Summary
  key_activities_summary TEXT,

  -- Driving
  driving_from_previous VARCHAR(100),
  driving_notes TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_segments_trip_id ON trip_segments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_segments_dates ON trip_segments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trip_segments_sort ON trip_segments(trip_id, sort_order);

-- Enable RLS
ALTER TABLE trip_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip segments" ON trip_segments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_segments.trip_id AND trips.user_id = auth.uid())
  );

-- =============================================
-- TRIP ACCOMMODATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS trip_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES trip_segments(id) ON DELETE SET NULL,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),

  -- Dates
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  check_in_time TIME DEFAULT '15:00',
  check_out_time TIME DEFAULT '11:00',
  nights INTEGER,

  -- Room
  room_type VARCHAR(100),

  -- Cost
  cost DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  points_used INTEGER,
  loyalty_program VARCHAR(50),

  -- Booking
  booking_reference VARCHAR(50),

  -- Details
  amenities JSONB,  -- ["pool", "breakfast", "parking"]
  website TEXT,
  phone VARCHAR(30),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_trip_id ON trip_accommodations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_segment_id ON trip_accommodations(segment_id);
CREATE INDEX IF NOT EXISTS idx_trip_accommodations_dates ON trip_accommodations(check_in_date, check_out_date);

-- Enable RLS
ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip accommodations" ON trip_accommodations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_accommodations.trip_id AND trips.user_id = auth.uid())
  );

-- =============================================
-- TRIP DAYS
-- =============================================
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES trip_segments(id) ON DELETE SET NULL,

  -- Date
  date DATE NOT NULL,
  day_number INTEGER,

  -- Info
  title VARCHAR(255),
  overview TEXT,

  -- Weather
  weather_high_c INTEGER,
  weather_low_c INTEGER,
  weather_conditions VARCHAR(100),

  -- Photo Opportunities
  photo_opportunities JSONB,  -- [{location, description, best_time}]

  -- Notes
  notes TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_days_segment_id ON trip_days(segment_id);
CREATE INDEX IF NOT EXISTS idx_trip_days_date ON trip_days(date);
CREATE INDEX IF NOT EXISTS idx_trip_days_sort ON trip_days(trip_id, sort_order);

-- Enable RLS
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip days" ON trip_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );

-- =============================================
-- TRIP ACTIVITIES
-- =============================================
CREATE TABLE IF NOT EXISTS trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type
  activity_type VARCHAR(30),  -- hike, beach, restaurant, museum, transport, activity
  time_block VARCHAR(20),     -- morning, midday, sunset, evening

  -- Time
  start_time TIME,
  end_time TIME,

  -- Location
  location_name VARCHAR(255),
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  google_maps_url TEXT,

  -- Details (v3 format)
  why_its_great TEXT,
  kid_friendliness TEXT,
  gear_prep TEXT,

  -- Cost
  cost_estimate DECIMAL(10,2),
  cost_currency VARCHAR(3) DEFAULT 'USD',

  -- Contact
  website TEXT,
  phone VARCHAR(30),

  -- Reservation
  reservation_required BOOLEAN DEFAULT false,
  reservation_details TEXT,

  -- Backup
  is_backup BOOLEAN DEFAULT false,

  -- AllTrails (for hikes)
  alltrails_url TEXT,
  alltrails_rating DECIMAL(2,1),
  alltrails_review_summary TEXT,

  -- Additional Details
  activity_details JSONB,  -- Type-specific fields

  -- Tips
  tips TEXT,
  notes TEXT,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Calendar Sync
  calendar_event_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_day_id ON trip_activities(day_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_time ON trip_activities(start_time);
CREATE INDEX IF NOT EXISTS idx_trip_activities_sort ON trip_activities(day_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_trip_activities_backup ON trip_activities(day_id, is_backup);

-- Enable RLS
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip activities" ON trip_activities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_activities.trip_id AND trips.user_id = auth.uid())
  );

-- =============================================
-- TRIP MEDIA
-- =============================================
CREATE TABLE IF NOT EXISTS trip_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Parent
  parent_type VARCHAR(20) NOT NULL CHECK (parent_type IN ('trip', 'segment', 'day', 'activity', 'accommodation')),
  parent_id UUID NOT NULL,

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

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_media_trip_id ON trip_media(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_user_id ON trip_media(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_parent ON trip_media(parent_type, parent_id);

-- Enable RLS
ALTER TABLE trip_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trip media" ON trip_media
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read shared trip media" ON trip_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_media.trip_id
      AND (trips.is_public = true OR trips.user_id = auth.uid())
    )
  );

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_segments_updated_at BEFORE UPDATE ON trip_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_accommodations_updated_at BEFORE UPDATE ON trip_accommodations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_days_updated_at BEFORE UPDATE ON trip_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_activities_updated_at BEFORE UPDATE ON trip_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
