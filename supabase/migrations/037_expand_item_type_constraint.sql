-- Migration: Expand item_type constraint to include more types
-- Adds: accommodation, neighborhood, experience

-- Drop the existing constraint
ALTER TABLE trip_research_items DROP CONSTRAINT IF EXISTS trip_research_items_item_type_check;

-- Add the expanded constraint
ALTER TABLE trip_research_items ADD CONSTRAINT trip_research_items_item_type_check
  CHECK (item_type IN (
    'restaurant', 'hike', 'attraction', 'beach', 'hotel',
    'activity', 'shop', 'service', 'viewpoint', 'transport',
    'accommodation', 'neighborhood', 'experience', 'museum', 'tour'
  ));

-- Add comment
COMMENT ON COLUMN trip_research_items.item_type IS 'Type of research item: restaurant, hike, attraction, beach, hotel, activity, shop, service, viewpoint, transport, accommodation, neighborhood, experience, museum, tour';
