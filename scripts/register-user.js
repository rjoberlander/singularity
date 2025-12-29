const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fcsiqoebtpfhzreamotp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc2lxb2VidHBmaHpyZWFtb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk0NTc4MywiZXhwIjoyMDgyNTIxNzgzfQ._ZtGprgcAiUpAqab3F3IYOPCdLoNnLjw-VjUvHcHAyg'
);

async function main() {
  // Find user
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  const user = data.users.find(u => u.email === 'rjoberlander@gmail.com');
  if (!user) {
    console.log('User not found, creating...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'rjoberlander@gmail.com',
      password: 'Cookie123!',
      email_confirm: true,
      user_metadata: { name: 'Rich Oh' }
    });
    if (createError) {
      console.error('Error creating:', createError.message);
    } else {
      console.log('User created!');
      console.log('User ID:', newUser.user.id);
    }
    return;
  }

  console.log('User found!');
  console.log('User ID:', user.id);
  console.log('Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
  console.log('Name:', user.user_metadata?.name || 'Not set');

  // Update user - confirm email, set password and name
  console.log('\nUpdating user...');
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
    user_metadata: { name: 'Rich Oh' },
    password: 'Cookie123!'
  });

  if (updateError) {
    console.error('Error updating:', updateError.message);
  } else {
    console.log('User updated successfully!');
    console.log('- Email confirmed');
    console.log('- Password set to Cookie123!');
    console.log('- Name set to Rich Oh');
  }
}

main();
