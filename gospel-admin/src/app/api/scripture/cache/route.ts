import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Cleanup old scripture cache entries
// Call this via cron job or manually to remove stale cache entries
export async function POST(request: NextRequest) {
  try {
    const { daysToKeep = 30 } = await request.json().catch(() => ({}))
    
    const supabase = createAdminClient()
    
    // Call the database function to cleanup old entries
    const { data, error } = await (supabase.rpc as any)('cleanup_old_scripture_cache', {
      days_to_keep: daysToKeep
    })

    if (error) {
      logger.error('Failed to cleanup scripture cache:', error)
      return NextResponse.json(
        { error: 'Failed to cleanup cache', details: error.message },
        { status: 500 }
      )
    }

    logger.info(`🧹 Cleaned up ${data} old scripture cache entries (older than ${daysToKeep} days)`)
    
    return NextResponse.json({
      success: true,
      deletedCount: data,
      daysToKeep
    })
  } catch (error) {
    logger.error('Cache cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup cache' },
      { status: 500 }
    )
  }
}

// GET endpoint to check cache statistics
export async function GET() {
  try {
    const supabase = createAdminClient()
    
    const { count, error } = await supabase
      .from('scripture_cache' as any)
      .select('*', { count: 'exact', head: true })

    if (error) {
      logger.error('Failed to get cache stats:', error)
      return NextResponse.json(
        { error: 'Failed to get cache statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      totalEntries: count || 0,
      cacheTTLDays: 30
    })
  } catch (error) {
    logger.error('Cache stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get cache statistics' },
      { status: 500 }
    )
  }
}
