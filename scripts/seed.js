#!/usr/bin/env node
/**
 * Singularity Database Seed Script
 * Creates a test user and populates with mock health data
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fcsiqoebtpfhzreamotp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_USER = {
  email: 'test@singularity.app',
  password: 'Test123!'
};

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // =============================================
    // 1. CREATE AUTH USER
    // =============================================
    console.log('👤 Creating test user...');

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId;

    const existingUser = existingUsers?.users?.find(u => u.email === TEST_USER.email);

    if (existingUser) {
      console.log('   User already exists:', existingUser.id);
      userId = existingUser.id;
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true
      });

      if (authError) throw authError;
      userId = authData.user.id;
      console.log('   Created user:', userId);
    }

    // =============================================
    // 2. CREATE USER PROFILE
    // =============================================
    console.log('\n📋 Creating user profile...');

    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: TEST_USER.email,
        name: 'Test User',
        role: 'owner',
        is_active: true,
        onboarding_completed: true
      }, { onConflict: 'id' });

    if (profileError) throw profileError;
    console.log('   Profile created/updated');

    // =============================================
    // 3. BIOMARKERS
    // =============================================
    console.log('\n🔬 Creating biomarkers...');

    const biomarkers = [
      { user_id: userId, name: 'Vitamin D', category: 'Vitamins', value: 45, unit: 'ng/mL', date_tested: '2024-12-15', reference_range_low: 30, reference_range_high: 100, optimal_range_low: 50, optimal_range_high: 80, notes: 'Slightly below optimal' },
      { user_id: userId, name: 'hs-CRP', category: 'Inflammation', value: 2.1, unit: 'mg/L', date_tested: '2024-12-15', reference_range_low: 0, reference_range_high: 3, optimal_range_low: 0, optimal_range_high: 1, notes: 'Elevated inflammation' },
      { user_id: userId, name: 'Testosterone', category: 'Hormones', value: 650, unit: 'ng/dL', date_tested: '2024-12-15', reference_range_low: 300, reference_range_high: 1000, optimal_range_low: 600, optimal_range_high: 900 },
      { user_id: userId, name: 'Fasting Glucose', category: 'Metabolic', value: 92, unit: 'mg/dL', date_tested: '2024-12-15', reference_range_low: 70, reference_range_high: 100, optimal_range_low: 70, optimal_range_high: 90 },
      { user_id: userId, name: 'HbA1c', category: 'Metabolic', value: 5.4, unit: '%', date_tested: '2024-12-15', reference_range_low: 4.0, reference_range_high: 5.7, optimal_range_low: 4.0, optimal_range_high: 5.3 },
      { user_id: userId, name: 'Ferritin', category: 'Blood', value: 120, unit: 'ng/mL', date_tested: '2024-12-15', reference_range_low: 30, reference_range_high: 400, optimal_range_low: 50, optimal_range_high: 150 },
      { user_id: userId, name: 'B12', category: 'Vitamins', value: 680, unit: 'pg/mL', date_tested: '2024-12-15', reference_range_low: 200, reference_range_high: 900, optimal_range_low: 500, optimal_range_high: 800 },
      { user_id: userId, name: 'TSH', category: 'Hormones', value: 1.8, unit: 'mIU/L', date_tested: '2024-12-15', reference_range_low: 0.5, reference_range_high: 4.5, optimal_range_low: 1.0, optimal_range_high: 2.5 }
    ];

    const { error: bioError } = await supabase.from('biomarkers').insert(biomarkers);
    if (bioError && !bioError.message.includes('duplicate')) throw bioError;
    console.log(`   Created ${biomarkers.length} biomarkers`);

    // =============================================
    // 4. SUPPLEMENTS
    // =============================================
    console.log('\n💊 Creating supplements...');

    const supplements = [
      { user_id: userId, name: 'Vitamin D3', brand: 'Thorne', dose: '5000 IU', timing: 'Morning', frequency: 'Daily', is_active: true, price_per_serving: 0.25, category: 'Vitamins' },
      { user_id: userId, name: 'Omega-3 Fish Oil', brand: 'Nordic Naturals', dose: '2000mg', timing: 'With meals', frequency: 'Daily', is_active: true, price_per_serving: 0.45, category: 'Essential Fatty Acids' },
      { user_id: userId, name: 'Magnesium Glycinate', brand: 'Pure Encapsulations', dose: '400mg', timing: 'Evening', frequency: 'Daily', is_active: true, price_per_serving: 0.35, category: 'Minerals' },
      { user_id: userId, name: 'Creatine Monohydrate', brand: 'Thorne', dose: '5g', timing: 'Post-workout', frequency: 'Daily', is_active: true, price_per_serving: 0.20, category: 'Performance' },
      { user_id: userId, name: 'Vitamin K2', brand: 'Thorne', dose: '100mcg', timing: 'Morning', frequency: 'Daily', is_active: true, price_per_serving: 0.18, category: 'Vitamins' },
      { user_id: userId, name: 'Zinc Picolinate', brand: 'Thorne', dose: '30mg', timing: 'Evening', frequency: 'Daily', is_active: false, price_per_serving: 0.15, category: 'Minerals', notes: 'Paused - adequate levels' }
    ];

    const { data: suppData, error: suppError } = await supabase.from('supplements').insert(supplements).select();
    if (suppError && !suppError.message.includes('duplicate')) throw suppError;
    console.log(`   Created ${supplements.length} supplements`);

    const magnesiumId = suppData?.find(s => s.name === 'Magnesium Glycinate')?.id;

    // =============================================
    // 5. ROUTINES
    // =============================================
    console.log('\n📅 Creating routines...');

    const { data: routineData, error: routineError } = await supabase.from('routines').insert([
      { user_id: userId, name: 'Morning Routine', time_of_day: 'morning', sort_order: 1 },
      { user_id: userId, name: 'Evening Routine', time_of_day: 'evening', sort_order: 2 }
    ]).select();

    if (routineError && !routineError.message.includes('duplicate')) throw routineError;
    console.log('   Created 2 routines');

    const morningId = routineData?.find(r => r.name === 'Morning Routine')?.id;
    const eveningId = routineData?.find(r => r.name === 'Evening Routine')?.id;

    // =============================================
    // 6. ROUTINE ITEMS
    // =============================================
    if (morningId && eveningId) {
      console.log('\n📝 Creating routine items...');

      const routineItems = [
        { routine_id: morningId, title: 'Wake up + hydrate (16oz water)', time: '6:00 AM', sort_order: 1 },
        { routine_id: morningId, title: 'Take morning supplements', time: '6:15 AM', sort_order: 2 },
        { routine_id: morningId, title: 'Cold shower', duration: '3 min', sort_order: 3 },
        { routine_id: morningId, title: 'Meditation', duration: '10 min', sort_order: 4 },
        { routine_id: morningId, title: 'Morning sunlight exposure', duration: '15 min', sort_order: 5 },
        { routine_id: eveningId, title: 'Take evening supplements', time: '8:00 PM', linked_supplement: magnesiumId, sort_order: 1 },
        { routine_id: eveningId, title: 'Blue light blocking glasses', time: '9:00 PM', sort_order: 2 },
        { routine_id: eveningId, title: 'Reading (no screens)', duration: '30 min', sort_order: 3 },
        { routine_id: eveningId, title: 'Sleep', time: '10:00 PM', sort_order: 4 }
      ];

      const { error: itemsError } = await supabase.from('routine_items').insert(routineItems);
      if (itemsError && !itemsError.message.includes('duplicate')) throw itemsError;
      console.log(`   Created ${routineItems.length} routine items`);
    }

    // =============================================
    // 7. GOALS
    // =============================================
    console.log('\n🎯 Creating goals...');

    const { data: goalData, error: goalError } = await supabase.from('goals').insert([
      { user_id: userId, title: 'Optimize Vitamin D Levels', category: 'Vitamins', target_biomarker: 'Vitamin D', current_value: 45, target_value: 70, direction: 'increase', status: 'active', priority: 1 },
      { user_id: userId, title: 'Reduce Inflammation', category: 'Metabolic', target_biomarker: 'hs-CRP', current_value: 2.1, target_value: 1.0, direction: 'decrease', status: 'active', priority: 2 },
      { user_id: userId, title: 'Improve Sleep Quality', category: 'Lifestyle', direction: 'maintain', status: 'active', priority: 3 }
    ]).select();

    if (goalError && !goalError.message.includes('duplicate')) throw goalError;
    console.log('   Created 3 goals');

    // =============================================
    // 8. GOAL INTERVENTIONS
    // =============================================
    if (goalData) {
      console.log('\n💡 Creating goal interventions...');

      const vitdGoal = goalData.find(g => g.title.includes('Vitamin D'));
      const crpGoal = goalData.find(g => g.title.includes('Inflammation'));
      const sleepGoal = goalData.find(g => g.title.includes('Sleep'));

      const interventions = [];

      if (vitdGoal) {
        interventions.push(
          { goal_id: vitdGoal.id, intervention: '5000 IU Vitamin D3 daily', type: 'supplement' },
          { goal_id: vitdGoal.id, intervention: 'Morning sunlight exposure 15+ min', type: 'lifestyle' },
          { goal_id: vitdGoal.id, intervention: 'Take with fat for absorption', type: 'protocol' }
        );
      }

      if (crpGoal) {
        interventions.push(
          { goal_id: crpGoal.id, intervention: 'Omega-3 supplementation 2g/day', type: 'supplement' },
          { goal_id: crpGoal.id, intervention: 'Anti-inflammatory diet', type: 'lifestyle' },
          { goal_id: crpGoal.id, intervention: 'Regular exercise 4x/week', type: 'lifestyle' }
        );
      }

      if (sleepGoal) {
        interventions.push(
          { goal_id: sleepGoal.id, intervention: 'Magnesium before bed', type: 'supplement' },
          { goal_id: sleepGoal.id, intervention: 'Blue light blocking after 9pm', type: 'lifestyle' },
          { goal_id: sleepGoal.id, intervention: 'Consistent 10pm bedtime', type: 'protocol' }
        );
      }

      const { error: intError } = await supabase.from('goal_interventions').insert(interventions);
      if (intError && !intError.message.includes('duplicate')) throw intError;
      console.log(`   Created ${interventions.length} interventions`);
    }

    // =============================================
    // 9. CHANGE LOG
    // =============================================
    console.log('\n📊 Creating change log entries...');

    const now = new Date();
    const changeLogs = [
      { user_id: userId, date: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), change_type: 'started', item_type: 'supplement', item_name: 'Vitamin K2', new_value: '100mcg daily', reason: 'Synergistic with Vitamin D3' },
      { user_id: userId, date: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), change_type: 'modified', item_type: 'supplement', item_name: 'Vitamin D3', previous_value: '2000 IU', new_value: '5000 IU', reason: 'Labs showed suboptimal levels' },
      { user_id: userId, date: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), change_type: 'stopped', item_type: 'supplement', item_name: 'Zinc Picolinate', reason: 'Reached adequate levels' },
      { user_id: userId, date: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(), change_type: 'started', item_type: 'routine', item_name: 'Cold shower', new_value: '3 min cold exposure', reason: 'Testing for inflammation reduction' }
    ];

    const { error: logError } = await supabase.from('change_log').insert(changeLogs);
    if (logError && !logError.message.includes('duplicate')) throw logError;
    console.log(`   Created ${changeLogs.length} log entries`);

    // =============================================
    // SUMMARY
    // =============================================
    console.log('\n✅ Seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Test Account Credentials:');
    console.log(`  Email:    ${TEST_USER.email}`);
    console.log(`  Password: ${TEST_USER.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
