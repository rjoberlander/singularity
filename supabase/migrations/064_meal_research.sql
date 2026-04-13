-- Add meal_preferences JSONB to travel_settings for storing dining research preferences
ALTER TABLE travel_settings ADD COLUMN IF NOT EXISTS meal_preferences JSONB;
COMMENT ON COLUMN travel_settings.meal_preferences IS 'User meal research preferences: dining_style, priorities, avoid, cuisine_interests, budget, dietary_restrictions, family_context';

-- Note: restaurant_suggestion_source on trip_activities is a soft enum (no CHECK constraint)
-- so 'web_research' can be used directly without schema changes.
