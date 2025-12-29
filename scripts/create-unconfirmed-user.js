const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

async function main() {
  // Create user WITHOUT email confirmation
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'unconfirmed@test.com',
    password: 'TestPassword123!',
    email_confirm: false, // NOT confirmed
    user_metadata: { name: 'Unconfirmed User' }
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('User already exists, checking confirmation status...');
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === 'unconfirmed@test.com');
      if (user) {
        console.log('Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
        if (user.email_confirmed_at) {
          // Unconfirm the email by updating
          console.log('Removing email confirmation...');
          // Note: Supabase doesn't allow "unconfirming" - we need to delete and recreate
          await supabase.auth.admin.deleteUser(user.id);
          console.log('Deleted user, recreating without confirmation...');
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: 'unconfirmed@test.com',
            password: 'TestPassword123!',
            email_confirm: false,
            user_metadata: { name: 'Unconfirmed User' }
          });
          if (createError) {
            console.error('Error:', createError.message);
          } else {
            console.log('Created unconfirmed user:', newUser.user.id);
          }
        }
      }
    } else {
      console.error('Error:', error.message);
    }
    return;
  }

  console.log('Created unconfirmed user!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('Email confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
}

main();
