-- Accommodation enrichment: add structured fields for parking, breakfast, amenities, location context

-- Property classification
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS property_type VARCHAR(30);
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS star_rating DECIMAL(2,1);

-- Google Places extended data
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS google_editorial_summary TEXT;

-- Parking
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS parking JSONB;

-- Breakfast
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS breakfast JSONB;

-- Structured amenities (richer than the flat array)
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS amenities_structured JSONB;

-- Location context
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255);
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS nearby_landmarks JSONB;

-- Enrichment tracking
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS enrichment_source VARCHAR(30);

-- Allow 'document' media_type for receipt/confirmation uploads
-- Check if the constraint exists and is restrictive; if so, drop and re-add.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'trip_media_media_type_check'
  ) THEN
    ALTER TABLE trip_media DROP CONSTRAINT trip_media_media_type_check;
    ALTER TABLE trip_media ADD CONSTRAINT trip_media_media_type_check
      CHECK (media_type IN ('image', 'video', 'document'));
  END IF;
END $$;
