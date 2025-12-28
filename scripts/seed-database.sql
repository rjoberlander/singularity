-- Singularity Database Seed Script
-- Run this in Supabase SQL Editor to create mock data

-- =============================================
-- CREATE TEST USER
-- First, create a user in Supabase Auth Dashboard or use this for the users table
-- Note: You need to create auth user first via Dashboard > Authentication > Users > Add User
-- Use email: test@singularity.app, password: Test123!
-- =============================================

-- After creating auth user, get the UUID and use it below
-- Replace 'YOUR_USER_UUID_HERE' with the actual UUID from auth.users

DO $$
DECLARE
  test_user_id UUID;
  morning_routine_id UUID;
  evening_routine_id UUID;
  vitd_goal_id UUID;
  crp_goal_id UUID;
  magnesium_supp_id UUID;
BEGIN
  -- Try to get existing test user
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@singularity.app' LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No test user found. Please create a user with email test@singularity.app in Auth Dashboard first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found test user: %', test_user_id;

  -- =============================================
  -- INSERT USER PROFILE
  -- =============================================
  INSERT INTO users (id, email, name, role, is_active, onboarding_completed)
  VALUES (test_user_id, 'test@singularity.app', 'Test User', 'owner', true, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    onboarding_completed = true;

  -- =============================================
  -- BIOMARKERS
  -- =============================================
  INSERT INTO biomarkers (user_id, name, category, value, unit, date_tested, reference_range_low, reference_range_high, optimal_range_low, optimal_range_high, notes) VALUES
    (test_user_id, 'Vitamin D', 'Vitamins', 45, 'ng/mL', '2024-12-15', 30, 100, 50, 80, 'Slightly below optimal, increasing supplementation'),
    (test_user_id, 'hs-CRP', 'Inflammation', 2.1, 'mg/L', '2024-12-15', 0, 3, 0, 1, 'Elevated inflammation marker'),
    (test_user_id, 'Testosterone', 'Hormones', 650, 'ng/dL', '2024-12-15', 300, 1000, 600, 900, 'Within optimal range'),
    (test_user_id, 'Fasting Glucose', 'Metabolic', 92, 'mg/dL', '2024-12-15', 70, 100, 70, 90, 'Slightly above optimal'),
    (test_user_id, 'HbA1c', 'Metabolic', 5.4, '%', '2024-12-15', 4.0, 5.7, 4.0, 5.3, 'Good glycemic control'),
    (test_user_id, 'Ferritin', 'Blood', 120, 'ng/mL', '2024-12-15', 30, 400, 50, 150, 'Optimal iron stores'),
    (test_user_id, 'B12', 'Vitamins', 680, 'pg/mL', '2024-12-15', 200, 900, 500, 800, 'Good B12 levels'),
    (test_user_id, 'TSH', 'Hormones', 1.8, 'mIU/L', '2024-12-15', 0.5, 4.5, 1.0, 2.5, 'Optimal thyroid function')
  ON CONFLICT DO NOTHING;

  -- =============================================
  -- SUPPLEMENTS
  -- =============================================
  INSERT INTO supplements (user_id, name, brand, dose, timing, frequency, is_active, price_per_serving, category, notes) VALUES
    (test_user_id, 'Vitamin D3', 'Thorne', '5000 IU', 'Morning', 'Daily', true, 0.25, 'Vitamins', 'Take with fat for better absorption'),
    (test_user_id, 'Omega-3 Fish Oil', 'Nordic Naturals', '2000mg', 'With meals', 'Daily', true, 0.45, 'Essential Fatty Acids', 'EPA/DHA for inflammation'),
    (test_user_id, 'Magnesium Glycinate', 'Pure Encapsulations', '400mg', 'Evening', 'Daily', true, 0.35, 'Minerals', 'For sleep and recovery'),
    (test_user_id, 'Creatine Monohydrate', 'Thorne', '5g', 'Post-workout', 'Daily', true, 0.20, 'Performance', 'Cognitive and muscle benefits'),
    (test_user_id, 'Vitamin K2', 'Thorne', '100mcg', 'Morning', 'Daily', true, 0.18, 'Vitamins', 'Synergistic with D3'),
    (test_user_id, 'Zinc Picolinate', 'Thorne', '30mg', 'Evening', 'Daily', false, 0.15, 'Minerals', 'Paused - adequate levels')
  ON CONFLICT DO NOTHING;

  -- Get the magnesium supplement ID for linking
  SELECT id INTO magnesium_supp_id FROM supplements WHERE user_id = test_user_id AND name = 'Magnesium Glycinate' LIMIT 1;

  -- =============================================
  -- ROUTINES
  -- =============================================
  INSERT INTO routines (id, user_id, name, time_of_day, sort_order) VALUES
    (gen_random_uuid(), test_user_id, 'Morning Routine', 'morning', 1),
    (gen_random_uuid(), test_user_id, 'Evening Routine', 'evening', 2)
  ON CONFLICT DO NOTHING;

  -- Get routine IDs
  SELECT id INTO morning_routine_id FROM routines WHERE user_id = test_user_id AND name = 'Morning Routine' LIMIT 1;
  SELECT id INTO evening_routine_id FROM routines WHERE user_id = test_user_id AND name = 'Evening Routine' LIMIT 1;

  -- =============================================
  -- ROUTINE ITEMS
  -- =============================================
  IF morning_routine_id IS NOT NULL THEN
    INSERT INTO routine_items (routine_id, title, time, duration, sort_order) VALUES
      (morning_routine_id, 'Wake up + hydrate (16oz water)', '6:00 AM', NULL, 1),
      (morning_routine_id, 'Take morning supplements', '6:15 AM', NULL, 2),
      (morning_routine_id, 'Cold shower', NULL, '3 min', 3),
      (morning_routine_id, 'Meditation', NULL, '10 min', 4),
      (morning_routine_id, 'Morning sunlight exposure', NULL, '15 min', 5)
    ON CONFLICT DO NOTHING;
  END IF;

  IF evening_routine_id IS NOT NULL THEN
    INSERT INTO routine_items (routine_id, title, time, duration, linked_supplement, sort_order) VALUES
      (evening_routine_id, 'Take evening supplements', '8:00 PM', NULL, magnesium_supp_id, 1),
      (evening_routine_id, 'Blue light blocking glasses', '9:00 PM', NULL, NULL, 2),
      (evening_routine_id, 'Reading (no screens)', NULL, '30 min', NULL, 3),
      (evening_routine_id, 'Sleep', '10:00 PM', NULL, NULL, 4)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================
  -- GOALS
  -- =============================================
  INSERT INTO goals (id, user_id, title, category, target_biomarker, current_value, target_value, direction, status, priority, notes) VALUES
    (gen_random_uuid(), test_user_id, 'Optimize Vitamin D Levels', 'Vitamins', 'Vitamin D', 45, 70, 'increase', 'active', 1, 'Aiming for optimal range 50-80 ng/mL'),
    (gen_random_uuid(), test_user_id, 'Reduce Inflammation', 'Metabolic', 'hs-CRP', 2.1, 1.0, 'decrease', 'active', 2, 'Target hs-CRP under 1.0 mg/L'),
    (gen_random_uuid(), test_user_id, 'Improve Sleep Quality', 'Lifestyle', NULL, NULL, NULL, 'maintain', 'active', 3, 'Track sleep with Oura ring')
  ON CONFLICT DO NOTHING;

  -- Get goal IDs for interventions
  SELECT id INTO vitd_goal_id FROM goals WHERE user_id = test_user_id AND title = 'Optimize Vitamin D Levels' LIMIT 1;
  SELECT id INTO crp_goal_id FROM goals WHERE user_id = test_user_id AND title = 'Reduce Inflammation' LIMIT 1;

  -- =============================================
  -- GOAL INTERVENTIONS
  -- =============================================
  IF vitd_goal_id IS NOT NULL THEN
    INSERT INTO goal_interventions (goal_id, intervention, type, status) VALUES
      (vitd_goal_id, '5000 IU Vitamin D3 daily', 'supplement', 'active'),
      (vitd_goal_id, 'Morning sunlight exposure 15+ minutes', 'lifestyle', 'active'),
      (vitd_goal_id, 'Take with fat source for absorption', 'protocol', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF crp_goal_id IS NOT NULL THEN
    INSERT INTO goal_interventions (goal_id, intervention, type, status) VALUES
      (crp_goal_id, 'Omega-3 supplementation 2g/day', 'supplement', 'active'),
      (crp_goal_id, 'Anti-inflammatory diet (reduce processed foods)', 'lifestyle', 'active'),
      (crp_goal_id, 'Regular exercise 4x/week', 'lifestyle', 'active'),
      (crp_goal_id, 'Prioritize sleep quality', 'lifestyle', 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- =============================================
  -- CHANGE LOG (Recent Activity)
  -- =============================================
  INSERT INTO change_log (user_id, date, change_type, item_type, item_name, new_value, reason) VALUES
    (test_user_id, NOW() - INTERVAL '1 day', 'started', 'supplement', 'Vitamin K2', '100mcg daily', 'Synergistic with Vitamin D3'),
    (test_user_id, NOW() - INTERVAL '3 days', 'modified', 'supplement', 'Vitamin D3', '5000 IU (from 2000 IU)', 'Labs showed suboptimal levels'),
    (test_user_id, NOW() - INTERVAL '5 days', 'stopped', 'supplement', 'Zinc Picolinate', NULL, 'Reached adequate levels'),
    (test_user_id, NOW() - INTERVAL '7 days', 'started', 'routine', 'Cold shower', '3 min cold exposure', 'Testing for inflammation reduction')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;

-- Verify data
SELECT 'Users' as table_name, count(*) as count FROM users
UNION ALL SELECT 'Biomarkers', count(*) FROM biomarkers
UNION ALL SELECT 'Supplements', count(*) FROM supplements
UNION ALL SELECT 'Routines', count(*) FROM routines
UNION ALL SELECT 'Routine Items', count(*) FROM routine_items
UNION ALL SELECT 'Goals', count(*) FROM goals
UNION ALL SELECT 'Goal Interventions', count(*) FROM goal_interventions
UNION ALL SELECT 'Change Log', count(*) FROM change_log;
