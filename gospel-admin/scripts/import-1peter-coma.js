/**
 * Import 1 Peter COMA Study template into the database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function import1PeterTemplate() {
  try {
    const templatePath = path.join(__dirname, '../data/templates/1peter-coma-study.json');
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    const slug = '1petcoma' + Date.now().toString().slice(-6);

    console.log('Importing 1 Peter COMA Study template...');
    console.log('Title:', templateData.title);
    console.log('Slug:', slug);
    console.log('Sections:', templateData.gospelData.length);

    const { data: existing } = await supabase
      .from('profiles')
      .select('id, slug, title')
      .ilike('title', '%1 Peter COMA%')
      .eq('is_template', true);

    if (existing && existing.length > 0) {
      console.log('\nExisting 1 Peter templates found:');
      existing.forEach(p => console.log('  - ' + p.title + ' (' + p.slug + ')'));
    }

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

    if (error) throw error;

    console.log('\n✓ Template imported successfully!');
    console.log('  Profile ID:', data.id);
    console.log('  Slug:', data.slug);
    console.log('  URL: /admin/profiles/' + data.slug + '/content');

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

import1PeterTemplate();
