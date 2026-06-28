#!/usr/bin/env npx tsx
/**
 * Seed admin_settings.secular_term_map from SECULAR_TERM_MAP_SEED when empty.
 *
 * Usage (from gospel-admin/):
 *   npm run seed-biblical-counseling-secular-map
 *   npm run seed-biblical-counseling-secular-map -- --force
 */
import dotenv from 'dotenv'

import { seedSecularTermMapIfEmpty } from '../src/lib/biblicalCounseling/secularTermMapDb'

dotenv.config({ path: '.env.local' })

const FORCE = process.argv.includes('--force')

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const result = await seedSecularTermMapIfEmpty(FORCE)
  if (result === 'seeded') {
    console.log(FORCE ? 'Seeded secular_term_map (forced).' : 'Seeded secular_term_map from seed data.')
  } else {
    console.log('Skipped — secular_term_map already populated. Use --force to overwrite.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
