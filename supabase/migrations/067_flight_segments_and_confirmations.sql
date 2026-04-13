-- Add flight_segments column for per-leg breakdown of connecting flights
-- [{flight_number, departure_airport, arrival_airport, departure_datetime, arrival_datetime, duration_minutes}]
ALTER TABLE trip_flights ADD COLUMN IF NOT EXISTS flight_segments JSONB;

-- Add agency_reference for bookings through travel agencies (e.g. Chase Travel)
ALTER TABLE trip_flights ADD COLUMN IF NOT EXISTS agency_reference VARCHAR(50);

-- Add cost fields for flights
ALTER TABLE trip_flights ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2);
ALTER TABLE trip_flights ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE trip_flights ADD COLUMN IF NOT EXISTS points_used INTEGER;

-- Expand trip_media parent_type to include 'flight' and 'driving' for PDF confirmations
ALTER TABLE trip_media DROP CONSTRAINT IF EXISTS trip_media_parent_type_check;
ALTER TABLE trip_media ADD CONSTRAINT trip_media_parent_type_check
  CHECK (parent_type IN ('trip', 'segment', 'day', 'activity', 'accommodation', 'flight', 'driving'));
