-- Migration: Add unique constraint on biomarkers (user_id, name, date_tested)
-- This prevents duplicate entries for the same biomarker on the same date

-- Step 1: Delete duplicate entries, keeping only the most recent (by created_at) for each combination
DELETE FROM biomarkers
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, name, date_tested
             ORDER BY created_at DESC
           ) as row_num
    FROM biomarkers
  ) ranked
  WHERE row_num > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE biomarkers
ADD CONSTRAINT biomarkers_user_name_date_unique
UNIQUE (user_id, name, date_tested);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT biomarkers_user_name_date_unique ON biomarkers IS
'Ensures only one entry per biomarker name per date per user';
