const { migrateFromSingleFile } = require('./gospel-admin/src/lib/new-file-data-service.ts')

async function runMigration() {
  try {
    console.log('Starting migration...')
    await migrateFromSingleFile()
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

runMigration()
