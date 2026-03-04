#!/usr/bin/env node
/**
 * Generate SQL migrations for Physical Intimacy profile gospel_data.
 * Reads export and restructured JSON, writes rollback and forward migrations.
 * Run after: export-physical-intimacy-profile.js and transform-physical-intimacy-outline.js
 */
const fs = require('fs');
const path = require('path');

const exportPath = path.join(__dirname, '../data/physical-intimacy-export.json');
const restructuredPath = path.join(__dirname, '../data/physical-intimacy-restructured.json');
const migrationsDir = path.join(__dirname, '../sql/migrations');

function gospelDataToSqlLiteral(gospelData) {
  const json = JSON.stringify(gospelData);
  return "'" + json.replace(/'/g, "''") + "'";
}

function main() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rollbackFile = path.join(migrationsDir, `${dateStr}_physical_intimacy_rollback.sql`);
  const forwardFile = path.join(migrationsDir, `${dateStr}_physical_intimacy_restructure.sql`);

  if (!fs.existsSync(exportPath)) {
    console.error('Run scripts/export-physical-intimacy-profile.js first.');
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const currentGospelData = exportData.gospel_data;
  const slug = exportData.slug;

  if (!slug) {
    console.error('Export missing slug');
    process.exit(1);
  }

  let restructuredGospelData;
  if (fs.existsSync(restructuredPath)) {
    const restructured = JSON.parse(fs.readFileSync(restructuredPath, 'utf8'));
    restructuredGospelData = restructured.gospel_data;
  } else {
    console.error('Run scripts/transform-physical-intimacy-outline.js first.');
    process.exit(1);
  }

  const rollbackSql = `-- Migration: Rollback Physical Intimacy gospel_data to current (pre-restructure) state
-- Use this to undo the restructure migration if needed
-- Profile: ${exportData.title}
-- Slug: ${slug}
-- Generated: ${new Date().toISOString()}

UPDATE public.profiles
SET gospel_data = ${gospelDataToSqlLiteral(currentGospelData)}::jsonb,
    updated_at = NOW()
WHERE slug = '${slug.replace(/'/g, "''")}';
`;

  const forwardSql = `-- Migration: Restructure Physical Intimacy gospel_data from outline
-- Parses outline in content into proper sections/subsections
-- Profile: ${exportData.title}
-- Slug: ${slug}
-- Generated: ${new Date().toISOString()}

UPDATE public.profiles
SET gospel_data = ${gospelDataToSqlLiteral(restructuredGospelData)}::jsonb,
    updated_at = NOW()
WHERE slug = '${slug.replace(/'/g, "''")}';
`;

  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  fs.writeFileSync(rollbackFile, rollbackSql, 'utf8');
  fs.writeFileSync(forwardFile, forwardSql, 'utf8');

  console.log('Created migrations:');
  console.log('  Rollback (current data):', rollbackFile);
  console.log('  Forward (restructured):', forwardFile);
}

main();
