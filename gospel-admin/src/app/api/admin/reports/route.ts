import { NextRequest, NextResponse } from 'next/server'
import { mergeTranslationReportCodes } from '@/lib/bible-translations'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    const { reportType } = await request.json()

    if (!reportType || typeof reportType !== 'string') {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      )
    }

    // Special case: fetch available translations
    if (reportType === 'get_translations') {
      const adminClient = createAdminClient()
      
      // Get unique translations from the database
      const { data: logs, error: fetchError } = await adminClient
        .from('scripture_access_logs')
        .select('translation')
      
      if (fetchError) {
        return NextResponse.json({
          translations: mergeTranslationReportCodes([]),
        })
      }

      const uniqueFromDb = Array.from(
        new Set(
          (logs as any[])
            .map((log: any) => log.translation)
            .filter((trans: string) => trans && trans.length > 0)
        )
      )

      return NextResponse.json({
        translations: mergeTranslationReportCodes(uniqueFromDb),
      })
    }

    // Use admin client to fetch data
    const adminClient = createAdminClient()

    // Check if table exists
    const { error: tableError } = await adminClient
      .from('scripture_access_logs')
      .select('*', { count: 'exact', head: true })

    if (tableError) {
      return NextResponse.json({
        error: 'Scripture access logs table not found. Database migration required.',
        columns: [],
        data: [],
        instructions: 'Run this SQL in Supabase SQL Editor to create the table'
      }, { status: 404 })
    }

    // Fetch all logs to process on server
    const { data: allLogs, error: fetchError } = await adminClient
      .from('scripture_access_logs')
      .select('*')
      .order('timestamp', { ascending: false })

    if (fetchError) {
      logger.error(`Failed to fetch scripture logs:`, fetchError)
      return NextResponse.json({
        error: `Database query failed: ${fetchError.message}`,
        columns: [],
        data: []
      }, { status: 500 })
    }

    // Process query based on report type
    let result: any[] = []

    // Check if this is a translation-specific summary report
    if (reportType.endsWith('_summary') && allLogs) {
      const translation = reportType.replace('_summary', '')
      // Group by year and count unique sessions for this translation
      const byYear = new Map<number, { sessions: Set<string>; views: number; scriptures: Set<string> }>()
      
      for (const log of allLogs as any[]) {
        if (log.translation === translation && log.timestamp) {
          const year = new Date(log.timestamp).getFullYear()
          if (!byYear.has(year)) {
            byYear.set(year, { sessions: new Set(), views: 0, scriptures: new Set() })
          }
          const item = byYear.get(year)!
          item.sessions.add(log.session_id)
          item.views++
          item.scriptures.add(log.scripture_reference)
        }
      }

      result = Array.from(byYear.entries())
        .map(([year, data]) => ({
          year,
          translation,
          unique_sessions: data.sessions.size,
          total_scripture_views: data.views,
          unique_scriptures: data.scriptures.size,
          avg_views_per_session: +(data.views / data.sessions.size).toFixed(2)
        }))
        .sort((a, b) => b.year - a.year)
    } else if (reportType === 'unique_sessions' && allLogs) {
      // Count by translation and year
      const byTranslationYear = new Map<string, Map<number, Set<string>>>()
      
      for (const log of allLogs as any[]) {
        if (log.timestamp) {
          const trans = log.translation || 'unknown'
          const year = new Date(log.timestamp).getFullYear()
          
          if (!byTranslationYear.has(trans)) {
            byTranslationYear.set(trans, new Map())
          }
          const yearMap = byTranslationYear.get(trans)!
          if (!yearMap.has(year)) {
            yearMap.set(year, new Set())
          }
          yearMap.get(year)!.add(log.session_id)
        }
      }

      for (const [trans, yearMap] of byTranslationYear) {
        for (const [year, sessions] of yearMap) {
          result.push({
            translation: trans,
            year,
            unique_sessions: sessions.size
          })
        }
      }
      result.sort((a, b) => b.year - a.year || a.translation.localeCompare(b.translation))
    } else if (reportType === 'all_translations' && allLogs) {
      // Breakdown by translation with monthly drill-down
      const byTranslation = new Map<string, { count: number; sessions: Set<string> }>()
      
      for (const log of allLogs as any[]) {
        const trans = log.translation || 'unknown'
        if (!byTranslation.has(trans)) {
          byTranslation.set(trans, { count: 0, sessions: new Set() })
        }
        const item = byTranslation.get(trans)!
        item.count++
        item.sessions.add(log.session_id)
      }

      result = Array.from(byTranslation.entries())
        .map(([translation, { count, sessions }]) => ({
          translation,
          total_views: count,
          unique_sessions: sessions.size,
          views_per_session: (count / sessions.size).toFixed(2)
        }))
        .sort((a, b) => b.total_views - a.total_views)
    } else if (reportType === 'top_scriptures' && allLogs) {
      // Group by translation, scripture, and year
      const byKey = new Map<string, { trans: string; ref: string; year: number; count: number; sessions: Set<string> }>()
      
      for (const log of allLogs as any[]) {
        if (log.scripture_reference) {
          const year = log.year_accessed || (log.timestamp ? new Date(log.timestamp).getFullYear() : new Date().getFullYear())
          const key = `${log.translation}|${log.scripture_reference}|${year}`
          
          if (!byKey.has(key)) {
            byKey.set(key, { 
              trans: log.translation, 
              ref: log.scripture_reference, 
              year, 
              count: 0, 
              sessions: new Set() 
            })
          }
          const item = byKey.get(key)!
          item.count++
          item.sessions.add(log.session_id)
        }
      }

      result = Array.from(byKey.values())
        .map(item => ({
          translation: item.trans,
          scripture_reference: item.ref,
          year: item.year,
          access_count: item.count,
          unique_sessions: item.sessions.size
        }))
        .sort((a, b) => b.year - a.year || a.translation.localeCompare(b.translation) || b.access_count - a.access_count)
        .slice(0, 100)
    } else {
      return NextResponse.json({
        columns: [],
        data: [],
        message: 'Unknown report type',
        reportType
      })
    }

    const columns = result.length > 0 ? Object.keys(result[0]) : []
    return NextResponse.json({
      columns,
      data: result
    })
  } catch (error) {
    logger.error('Reports API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
