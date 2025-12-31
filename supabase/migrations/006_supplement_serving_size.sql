-- Supplement Serving Size Migration
-- Adds: serving_size, intake_form, intake_quantity columns
--
-- This allows proper tracking of:
-- - How many units (capsules, scoops, etc.) = 1 serving
-- - What form the supplement comes in (capsule, powder, liquid, etc.)
-- - How many units the user takes per dose
--
-- Example: A bottle of 180 capsules with serving_size=2 means:
--   - 90 servings per container
--   - If dose_per_serving=1000mg, then each capsule is 500mg

-- =============================================
-- ADD NEW COLUMNS TO SUPPLEMENTS
-- =============================================

-- How many units (capsules, scoops, etc.) make up 1 serving
-- Default 1 since most supplements have 1 unit = 1 serving
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS serving_size INTEGER DEFAULT 1;

-- Physical form of the supplement (capsule, powder, liquid, spray, gummy, patch)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS intake_form TEXT;

-- How many units the user takes per dose (their personal intake, not serving size)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS intake_quantity INTEGER DEFAULT 1;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON COLUMN supplements.serving_size IS 'Number of units (capsules, scoops, etc.) per serving. E.g., 2 capsules = 1 serving';
COMMENT ON COLUMN supplements.intake_form IS 'Physical form: capsule, powder, liquid, spray, gummy, patch';
COMMENT ON COLUMN supplements.intake_quantity IS 'How many units the user takes per dose';
