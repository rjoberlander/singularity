-- Add guest_insights JSONB column for review-based accommodation tips
-- Stores: what_guests_love, check_in_tips, room_tips, things_to_know, family_tips, best_features

ALTER TABLE trip_accommodations ADD COLUMN IF NOT EXISTS guest_insights JSONB;
