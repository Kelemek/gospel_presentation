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
  const templatePath = path.join(__dirname, '../data/templates/gospel-presentation-acbc-questions.json');
  const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  console.log('Importing Gospel Presentation with ACBC Counseling Questions template...');
  console.log('Title:', templateData.title);

  // Generate a unique slug
  const timestamp = Date.now().toString().slice(-6);
  const slug = `gospelacbc${timestamp}`;
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
  let sections = 0;
  
  function countQuestions(obj) {
    if (obj.questions && Array.isArray(obj.questions)) {
      totalQuestions += obj.questions.length;
    }
    if (obj.subsections && Array.isArray(obj.subsections)) {
      obj.subsections.forEach(countQuestions);
    }
    if (obj.nestedSubsections && Array.isArray(obj.nestedSubsections)) {
      obj.nestedSubsections.forEach(countQuestions);
    }
  }
  
  templateData.gospelData.forEach(section => {
    sections++;
    countQuestions(section);
  });

  console.log('\nTemplate Statistics:');
  console.log('  Sections:', sections);
  console.log('  Total ACBC Counseling Questions:', totalQuestions);
}

importTemplate().catch(console.error);
