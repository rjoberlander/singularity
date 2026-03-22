-- Add Google Places columns to trip_accommodations
ALTER TABLE trip_accommodations
  ADD COLUMN IF NOT EXISTS google_place_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS photos_fetched BOOLEAN DEFAULT false;
