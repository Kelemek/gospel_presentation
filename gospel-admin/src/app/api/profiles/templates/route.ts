import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 30

/** Escape `%` / `_` for PostgreSQL ILIKE; strip commas so `.or()` clauses stay unambiguous. */
function ilikeFragment(raw: string): string {
  const noComma = raw.replace(/,/g, ' ').trim()
  return noComma.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function mapRowToListItem(row: Record<string, unknown>, usernameMap: Map<string, string>) {
  const createdBy = row.created_by as string | null
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    isDefault: row.is_default as boolean,
    isTemplate: (row.is_template as boolean) || false,
    isPublic: (row.is_public as boolean) || false,
    visitCount: row.visit_count as number,
    lastVisited: row.last_visited
      ? new Date(row.last_visited as string).toISOString()
      : undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    createdBy,
    ownerDisplayName: createdBy ? (usernameMap.get(createdBy) ?? null) : null,
    ownerUsername: createdBy ? usernameMap.get(createdBy) || undefined : undefined,
  }
}

/**
 * Paginated template profiles for admins (bypasses the PostgREST ~1000 row default cap
 * on a single unbounded `profiles` select). Supports server-side search on title, slug,
 * description, and owner display name / username.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: userProfile } = await adminClient.from('user_profiles').select('role').eq('id', user.id).single()
    const role = (userProfile as { role?: string } | null)?.role
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const qRaw = (searchParams.get('q') || '').trim()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = adminClient
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('is_template', true)
      .order('description', { ascending: true })
      .order('title', { ascending: true })

    if (qRaw.length > 0) {
      const frag = ilikeFragment(qRaw)
      const p = `%${frag}%`
      const orParts = [`title.ilike.${p}`, `slug.ilike.${p}`, `description.ilike.${p}`]

      const { data: ownerRows } = await adminClient
        .from('user_profiles')
        .select('id')
        .or(`display_name.ilike.${p},username.ilike.${p}`)

      const ownerIds = (ownerRows || []).map((r: { id: string }) => r.id).filter(Boolean)
      if (ownerIds.length > 0) {
        orParts.push(`created_by.in.(${ownerIds.join(',')})`)
      }
      query = query.or(orParts.join(','))
    }

    const { data: rows, error, count } = await query.range(from, to)

    if (error) {
      logger.error('[API] GET /api/profiles/templates', { error })
      return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
    }

    const data = rows || []
    const total = typeof count === 'number' ? count : 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    const usernameMap = new Map<string, string>()
    const allUserIds = new Set<string>()
    data.forEach((row: Record<string, unknown>) => {
      if (row.created_by) allUserIds.add(row.created_by as string)
    })

    if (allUserIds.size > 0) {
      const { data: userProfiles } = await adminClient
        .from('user_profiles')
        .select('id, username')
        .in('id', Array.from(allUserIds))
      if (userProfiles) {
        userProfiles.forEach((up: { id: string; username: string | null }) => {
          usernameMap.set(up.id, up.username || '')
        })
      }
    }

    const profiles = data.map((row) => mapRowToListItem(row as Record<string, unknown>, usernameMap))

    return NextResponse.json({
      profiles,
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (e) {
    logger.error('[API] GET /api/profiles/templates', e)
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 })
  }
}
