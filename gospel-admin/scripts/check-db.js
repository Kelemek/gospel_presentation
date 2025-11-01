const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mchtyihbwlzjhkcmdvib.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jaHR5aWhid2x6amhrY21kdmliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjQ1MTMsImV4cCI6MjA3NzQ0MDUxM30.DaPs61676KfcOZ40j3OH2UfQ6e1tjrWi9x4XnJ3K7vE'
);

async function checkDatabase() {
  console.log('Checking database state...\n');
  
  // Check profile_access table
  const { data: accessData, error: accessError } = await supabase
    .from('profile_access')
    .select('*')
    .limit(1);
  
  console.log('profile_access table exists:', !accessError);
  if (accessError) {
    console.log('  Error:', accessError.code, accessError.message);
  }
  
  // Check profiles table
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, slug, title, is_default')
    .limit(5);
  
  console.log('\nprofiles table query:');
  if (profilesError) {
    console.log('  Error:', profilesError.code, profilesError.message);
  } else {
    console.log('  Success! Found', profilesData?.length || 0, 'profiles');
    console.log('  Profiles:', JSON.stringify(profilesData, null, 2));
  }
}

checkDatabase().catch(console.error);
