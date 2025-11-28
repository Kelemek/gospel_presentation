/**
 * Import Philippians COMA Study template into the database
 * 
 * Usage: node scripts/import-philippians-coma.js
 * 
 * This creates a new profile marked as a template that can be cloned
 * for individual users.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importPhilippiansTemplate() {
  try {
    // Read the template file
    const templatePath = path.join(__dirname, '../data/templates/philippians-coma-study.json');
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    // Generate a unique slug (must be between 3-20 chars, lowercase alphanumeric starting with letter)
    const slug = 'philcoma' + Date.now().toString().slice(-6);

    console.log('Importing Philippians COMA Study template...');
    console.log('Title:', templateData.title);
    console.log('Slug:', slug);
    console.log('Sections:', templateData.gospelData.length);

    // Check if a Philippians template already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, slug, title')
      .ilike('title', '%Philippians COMA%')
      .eq('is_template', true);

    if (existing && existing.length > 0) {
      console.log('\nExisting Philippians templates found:');
      existing.forEach(p => console.log(`  - ${p.title} (${p.slug})`));
      console.log('\nDo you want to create another one? (Script will continue)');
    }

    // Insert the new profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        title: templateData.title,
        slug: slug,
        description: templateData.description,
        gospel_data: templateData.gospelData,
        is_default: false,
        is_template: true,
        visit_count: 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('\n✓ Template imported successfully!');
    console.log('  Profile ID:', data.id);
    console.log('  Slug:', data.slug);
    console.log('  URL: /admin/profiles/' + data.slug + '/content');

    // Count questions
    let totalQuestions = 0;
    templateData.gospelData.forEach(section => {
      section.subsections.forEach(sub => {
        totalQuestions += (sub.questions || []).length;
      });
    });
    console.log('\nTemplate Statistics:');
    console.log('  Weeks:', templateData.gospelData.length);
    console.log('  Total COMA Questions:', totalQuestions);

  } catch (error) {
    console.error('Error importing template:', error.message);
    process.exit(1);
  }
}

importPhilippiansTemplate();
