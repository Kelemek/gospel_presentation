import { NextResponse } from 'next/server'
import { getProfiles as getProfilesOld } from '@/lib/file-data-service'
import { getProfiles as getProfilesNew } from '@/lib/new-file-data-service'

// GET /api/admin/compare - Compare old vs new systems
export async function GET() {
  try {
    console.log('Comparing old vs new data systems...')
    
    // Get profiles from old system
    const oldProfiles = await getProfilesOld()
    
    // Get profiles from new system (will auto-migrate if needed)
    const newProfiles = await getProfilesNew()
    
    return NextResponse.json({ 
      old: {
        count: oldProfiles.length,
        profiles: oldProfiles.map(p => ({
          slug: p.slug,
          title: p.title,
          size: JSON.stringify(p).length + ' bytes'
        }))
      },
      new: {
        count: newProfiles.length,
        profiles: newProfiles.map(p => ({
          slug: p.slug,
          title: p.title,
          // Note: new system only loads metadata, not full data
          type: 'metadata-only'
        }))
      },
      benefits: [
        'Individual files for better performance',
        'Metadata-only loading for lists',
        'Reduced memory usage',
        'Better concurrent access',
        'Easier backup/restore individual profiles'
      ]
    })
  } catch (error) {
    console.error('Comparison failed:', error)
    return NextResponse.json(
      { 
        error: 'Comparison failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}