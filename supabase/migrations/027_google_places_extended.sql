-- Extended Google Places data for activities
-- Additional fields available from Google Places API (New)

-- Editorial summary from Google (brief description)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS google_editorial_summary TEXT;

-- Accessibility
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS wheelchair_accessible BOOLEAN;

-- Family/Group friendly
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS good_for_children BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS good_for_groups BOOLEAN;

-- Reservations
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS reservable BOOLEAN;

-- Service options (for restaurants)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_breakfast BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_lunch BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_dinner BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_brunch BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_vegetarian BOOLEAN;

-- Dining options
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS dine_in BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS takeout BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS delivery BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS outdoor_seating BOOLEAN;

-- Drinks
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_beer BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_wine BOOLEAN;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS serves_cocktails BOOLEAN;

-- Atmosphere
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS live_music BOOLEAN;

-- Allow pets
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS allows_dogs BOOLEAN;

-- Comments
COMMENT ON COLUMN trip_activities.google_editorial_summary IS 'Brief description from Google Places';
COMMENT ON COLUMN trip_activities.wheelchair_accessible IS 'Wheelchair accessible entrance';
COMMENT ON COLUMN trip_activities.good_for_children IS 'Good for children/families';
COMMENT ON COLUMN trip_activities.good_for_groups IS 'Good for groups';
COMMENT ON COLUMN trip_activities.reservable IS 'Accepts reservations';
