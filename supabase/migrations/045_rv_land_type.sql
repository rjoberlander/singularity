-- RV Land Type Migration
-- Adds land_type column for land management/ownership classification

-- =============================================
-- RV LOCATIONS LAND TYPE COLUMN
-- =============================================

-- Add land_type column to rv_locations
-- Valid values: national_park, state_park, national_monument, national_forest,
-- blm, national_recreation_area, national_wildlife_refuge, army_corps,
-- county_park, city_park, private_rv_park, private_campground, casino, other
ALTER TABLE rv_locations ADD COLUMN IF NOT EXISTS land_type TEXT;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN rv_locations.land_type IS 'Land management/ownership type (national_park, state_park, blm, etc.)';
