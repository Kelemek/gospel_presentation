import { NextResponse } from 'next/server'
import { migrateFromSingleFile } from '@/lib/new-file-data-service'

// POST /api/admin/migrate - Migrate from single file to individual files
export async function POST() {
  try {
    console.log('Starting migration from single file to individual profile files...')
    
    await migrateFromSingleFile()
    
    return NextResponse.json({ 
      message: 'Migration completed successfully',
      success: true 
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}