-- Add advance_booking column to trip_activities
-- Values: 'required' or 'recommended' (NULL = no advance booking needed)
ALTER TABLE trip_activities
  ADD COLUMN IF NOT EXISTS advance_booking text
  CHECK (advance_booking IN ('required', 'recommended'));

-- Backfill from existing data signals:
-- 1. reservation_required = true -> 'required'
-- 2. Text signals in practical_details.best_times / avoid_times / reservation_details
--    mentioning booking, reservations, advance tickets -> 'recommended'

-- Step 1: Set 'required' for activities with reservation_required = true
UPDATE trip_activities
SET advance_booking = 'required'
WHERE reservation_required = true
  AND advance_booking IS NULL;

-- Step 2: Set 'recommended' for activities with booking signals in text fields
UPDATE trip_activities
SET advance_booking = 'recommended'
WHERE advance_booking IS NULL
  AND (
    -- Check reservation_details
    (reservation_details IS NOT NULL AND (
      reservation_details ILIKE '%book%'
      OR reservation_details ILIKE '%reserv%'
      OR reservation_details ILIKE '%advance%'
      OR reservation_details ILIKE '%ticket%ahead%'
    ))
    -- Check practical_details->best_times array text
    OR (practical_details IS NOT NULL AND (
      practical_details::text ILIKE '%book%advance%'
      OR practical_details::text ILIKE '%advance%book%'
      OR practical_details::text ILIKE '%book%ticket%'
      OR practical_details::text ILIKE '%reserve%ahead%'
      OR practical_details::text ILIKE '%book%1 month%'
      OR practical_details::text ILIKE '%book%early%'
      OR practical_details::text ILIKE '%advance%reserv%'
      OR practical_details::text ILIKE '%without advance%'
      OR practical_details::text ILIKE '%without%reserv%'
      OR practical_details::text ILIKE '%book%day before%'
      OR practical_details::text ILIKE '%pre-book%'
      OR practical_details::text ILIKE '%prebook%'
      OR practical_details::text ILIKE '%reservation%availability%'
      OR practical_details::text ILIKE '%secure%time slot%'
      OR practical_details::text ILIKE '%book up quickly%'
    ))
  );
