require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importTemplate() {
  // Read the template file
  const templatePath = path.join(__dirname, '../data/templates/psalm23-coma-counseling.json');
  const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  console.log('Importing Psalm 23 COMA Counseling Study template...');
  console.log('Title:', templateData.title);

  // Generate a unique slug
  const timestamp = Date.now().toString().slice(-6);
  const slug = `ps23coma${timestamp}`;
  console.log('Slug:', slug);
  console.log('Sections:', templateData.gospelData.length);

  // Insert the template as a profile
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      slug: slug,
      title: templateData.title,
      description: templateData.description,
      gospel_data: templateData.gospelData,
      is_template: true,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error importing template:', error);
    process.exit(1);
  }

  console.log('\n✓ Template imported successfully!');
  console.log('  Profile ID:', data.id);
  console.log('  Slug:', data.slug);
  console.log('  URL: /admin/profiles/' + data.slug + '/content');

  // Count questions
  let totalQuestions = 0;
  let weeks = 0;
  templateData.gospelData.forEach(section => {
    weeks++;
    section.subsections?.forEach(subsection => {
      totalQuestions += subsection.questions?.length || 0;
    });
  });

  console.log('\nTemplate Statistics:');
  console.log('  Weeks:', weeks);
  console.log('  Total COMA Questions:', totalQuestions);
}

importTemplate().catch(console.error);
