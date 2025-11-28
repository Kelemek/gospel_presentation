/**
 * Update existing Ephesians COMA Study template
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

async function updateTemplate() {
  try {
    const templatePath = path.join(__dirname, '../data/templates/ephesians-coma-study.json');
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    console.log('Updating Ephesians COMA Study template...');

    // Update only the most recent one (by slug pattern)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        description: templateData.description,
        gospel_data: templateData.gospelData,
        updated_at: new Date().toISOString()
      })
      .eq('slug', 'ephcoma177692')
      .select();

    if (error) throw error;

    if (data && data.length > 0) {
      console.log('✓ Updated', data.length, 'template(s)');
      data.forEach(p => console.log('  -', p.title, '(' + p.slug + ')'));
    } else {
      console.log('No matching templates found to update');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateTemplate();
