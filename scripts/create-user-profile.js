const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

async function main() {
  // Check users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'rjoberlander@gmail.com');

  console.log('User profile in users table:', data);
  if (error) {
    console.error('Error:', error.message);
  }

  // If no profile, create one
  if (!data || data.length === 0) {
    console.log('No profile found, creating...');
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({
        id: 'b201a860-05a3-4ddc-bb89-4c4271177271',
        email: 'rjoberlander@gmail.com',
        name: 'Rich Oh',
        role: 'owner',
        is_active: true,
        onboarding_completed: false,
        onboarding_step: 'profile'
      })
      .select();

    if (insertError) {
      console.error('Insert error:', insertError.message);
    } else {
      console.log('Profile created:', inserted);
    }
  } else {
    console.log('Profile already exists');
  }
}

main();
