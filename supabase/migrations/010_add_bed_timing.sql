-- Migration: Add 'bed' timing option
-- Separates "Before Bed" and "Bed" as distinct timing options

-- Drop existing constraint
ALTER TABLE supplements DROP CONSTRAINT IF EXISTS supplements_timings_check;

-- Add updated constraint with 'bed' option
ALTER TABLE supplements ADD CONSTRAINT supplements_timings_check
  CHECK (timings IS NULL OR timings <@ ARRAY['wake_up', 'am', 'lunch', 'pm', 'dinner', 'before_bed', 'bed', 'specific']::TEXT[]);
