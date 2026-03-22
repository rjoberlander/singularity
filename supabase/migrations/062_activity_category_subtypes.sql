-- Migration 062: Activity Category + Sub-Type Refactoring
-- Redefines activity_type values as categories (restaurant, activity, transport, downtime, logistics)
-- Adds activity_sub_type for granular classification
-- Adds restaurant_suggestion_source for tracking how restaurant suggestions were made

-- 1. Add new columns
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS activity_sub_type VARCHAR(30);
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS restaurant_details JSONB;
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS restaurant_suggestion_source VARCHAR(30);

-- 2. Backfill existing data: remap old types to new category/sub-type pairs

-- rest → downtime/rest
UPDATE trip_activities SET activity_sub_type = 'rest', activity_type = 'downtime'
WHERE activity_type = 'rest';

-- hike → activity/hike
UPDATE trip_activities SET activity_sub_type = 'hike'
WHERE activity_type = 'hike';
UPDATE trip_activities SET activity_type = 'activity'
WHERE activity_type = 'hike';

-- beach → activity/beach
UPDATE trip_activities SET activity_sub_type = 'beach'
WHERE activity_type = 'beach';
UPDATE trip_activities SET activity_type = 'activity'
WHERE activity_type = 'beach';

-- viewpoint → activity/viewpoint
UPDATE trip_activities SET activity_sub_type = 'viewpoint'
WHERE activity_type = 'viewpoint';
UPDATE trip_activities SET activity_type = 'activity'
WHERE activity_type = 'viewpoint';

-- museum → activity/museum
UPDATE trip_activities SET activity_sub_type = 'museum'
WHERE activity_type = 'museum';
UPDATE trip_activities SET activity_type = 'activity'
WHERE activity_type = 'museum';

-- 'other' → activity/other
UPDATE trip_activities SET activity_sub_type = 'other'
WHERE activity_type = 'other';
UPDATE trip_activities SET activity_type = 'activity'
WHERE activity_type = 'other';

-- transport → infer sub_type from name
UPDATE trip_activities SET activity_sub_type = CASE
  WHEN LOWER(name) ~ '(uber|taxi|cab|ride to|transfer|shuttle)' THEN 'local'
  WHEN LOWER(name) ~ '(walk to|walk down|stroll|on foot)' THEN 'walking'
  WHEN LOWER(name) ~ '(drive to|depart|road trip|return to)' THEN 'long_haul'
  WHEN LOWER(name) ~ '(ferry|boat)' THEN 'ferry'
  WHEN LOWER(name) ~ '(train|rail|metro)' THEN 'train'
  WHEN LOWER(name) ~ '(flight|fly|airport)' THEN 'flight'
  ELSE 'local'
END WHERE activity_type = 'transport' AND activity_sub_type IS NULL;

-- restaurant → infer meal sub_type from name
UPDATE trip_activities SET activity_sub_type = CASE
  WHEN LOWER(name) ~ '(breakfast|morning)' THEN 'breakfast'
  WHEN LOWER(name) ~ '(lunch|midday)' THEN 'lunch'
  WHEN LOWER(name) ~ '(dinner|supper)' THEN 'dinner'
  WHEN LOWER(name) ~ '(snack|gelato|pastry|ice cream)' THEN 'snack'
  WHEN LOWER(name) ~ '(coffee|café|cafe|espresso)' THEN 'coffee'
  ELSE 'other'
END WHERE activity_type = 'restaurant' AND activity_sub_type IS NULL;

-- activity → infer sub_type from name (for remaining activity types without sub_type)
UPDATE trip_activities SET activity_sub_type = CASE
  WHEN LOWER(name) ~ '(tour|guided)' THEN 'tour'
  WHEN LOWER(name) ~ '(museum|gallery)' THEN 'museum'
  WHEN LOWER(name) ~ '(kayak|paddleboard|surf|snorkel)' THEN 'water_sport'
  WHEN LOWER(name) ~ '(shop|market|bazaar)' THEN 'shopping'
  WHEN LOWER(name) ~ '(fortress|castle|palace|monument|church)' THEN 'sightseeing'
  WHEN LOWER(name) ~ '(hike|trail|trek)' THEN 'hike'
  WHEN LOWER(name) ~ '(beach|praia)' THEN 'beach'
  WHEN LOWER(name) ~ '(viewpoint|miradouro|vista|sunset)' THEN 'viewpoint'
  ELSE 'other'
END WHERE activity_type = 'activity' AND activity_sub_type IS NULL;

-- 3. Add CHECK constraints
ALTER TABLE trip_activities ADD CONSTRAINT trip_activities_category_check
  CHECK (activity_type IN ('restaurant', 'activity', 'transport', 'downtime', 'logistics'));

ALTER TABLE trip_activities ADD CONSTRAINT trip_activities_sub_type_check
  CHECK (activity_sub_type IS NULL OR activity_sub_type IN (
    'tour', 'museum', 'hike', 'beach', 'viewpoint', 'water_sport', 'horseback',
    'shopping', 'nightlife', 'sightseeing', 'outdoor', 'other',
    'long_haul', 'local', 'walking', 'flight', 'ferry', 'train',
    'breakfast', 'lunch', 'dinner', 'snack', 'coffee',
    'rest', 'pool', 'relaxation',
    'check_in', 'check_out', 'packing'
  ));

ALTER TABLE trip_activities ADD CONSTRAINT trip_activities_suggestion_source_check
  CHECK (restaurant_suggestion_source IS NULL OR restaurant_suggestion_source IN (
    'ai_discovery', 'imported_research', 'user_manual', 'hotel_restaurant'
  ));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_trip_activities_sub_type ON trip_activities(activity_sub_type);
