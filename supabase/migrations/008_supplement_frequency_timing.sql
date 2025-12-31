-- Migration: Supplement frequency and timing improvements
-- Changes:
-- 1. Add `timings` TEXT[] column for multi-select timing (replaces single `timing`)
-- 2. Add `frequency_days` TEXT[] for custom day selection (e.g., ['mon', 'wed', 'fri'])
-- 3. Migrate existing timing values to timings array
-- 4. Update frequency constraint for new values

-- Add timings array column (multi-select: wake_up, am, lunch, pm, dinner, before_bed)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS timings TEXT[];

-- Add frequency_days array column (for custom frequency: sun, mon, tue, wed, thu, fri, sat)
ALTER TABLE supplements ADD COLUMN IF NOT EXISTS frequency_days TEXT[];

-- Migrate existing timing values to timings array
UPDATE supplements
SET timings = ARRAY[timing]
WHERE timing IS NOT NULL
  AND timing != ''
  AND (timings IS NULL OR array_length(timings, 1) IS NULL);

-- Drop old timing constraint if exists
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timing_check;

-- Add constraint for timings array values
ALTER TABLE supplements ADD CONSTRAINT supplements_timings_check
  CHECK (timings IS NULL OR timings <@ ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed', 'specific']::TEXT[]);

-- Add constraint for frequency_days array values
ALTER TABLE supplements ADD CONSTRAINT supplements_frequency_days_check
  CHECK (frequency_days IS NULL OR frequency_days <@ ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']::TEXT[]);

-- Add constraint for frequency values (updated options)
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_frequency_check;
ALTER TABLE supplements ADD CONSTRAINT supplements_frequency_check
  CHECK (frequency IS NULL OR frequency IN ('daily', 'every_other_day', 'custom', 'as_needed'));

-- Migrate old frequency values to new values
UPDATE supplements SET frequency = 'daily' WHERE frequency IN ('twice_daily', 'three_times_daily');
UPDATE supplements SET frequency = 'custom' WHERE frequency = 'weekly';
