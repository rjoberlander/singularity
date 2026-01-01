-- Migration: Consolidate timing options
-- - Add 'evening' (was missing)
-- - Remove 'before_bed' (duplicate of 'bed')
-- - Migrate existing 'before_bed' values to 'bed'

-- 1. Migrate 'before_bed' to 'bed' in timings array
UPDATE supplements
SET timings = array_replace(timings, 'before_bed', 'bed')
WHERE 'before_bed' = ANY(timings);

-- 2. Migrate legacy timing field
UPDATE supplements
SET timing = 'bed'
WHERE timing = 'before_bed';

-- 3. Drop existing constraint
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timings_check;

-- 4. Add updated constraint (removed 'before_bed', added 'evening')
ALTER TABLE supplements ADD CONSTRAINT supplements_timings_check
  CHECK (timings IS NULL OR timings <@ ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner', 'evening', 'bed', 'specific']::TEXT[]);
