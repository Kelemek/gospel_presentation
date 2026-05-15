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

function mapRowToListItem(
  row: Record<string, unknown>,
  usernameMap: Map<string, string>,
  accessMap: Map<string, string[]>
) {
  const id = row.id as string
  const createdBy = row.created_by as string | null
  const counseleeEmails = accessMap.get(id) || []
  return {
    id,
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
    counseleeEmails,
    usernames: counseleeEmails.map((email) => usernameMap.get(email)).filter(Boolean) as string[],
  }
}

/**
 * Paginated template profiles for admin/counselor (bypasses the PostgREST ~1000 row default cap
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
    if (role !== 'admin' && role !== 'counselor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientForLookups = role === 'admin' || role === 'counselor' ? adminClient : supabase

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    )
    const qRaw = (searchParams.get('q') || '').trim()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = clientForLookups
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

    const allCounseleeEmails = new Set<string>()
    const profileIds = data.map((row: Record<string, unknown>) => row.id as string).filter(Boolean)
    const accessMap = new Map<string, string[]>()

    if (profileIds.length > 0) {
      const { data: accessData } = await clientForLookups
        .from('profile_access')
        .select('profile_id, user_email')
        .in('profile_id', profileIds)
      if (accessData) {
        accessData.forEach((access: { profile_id: string; user_email: string }) => {
          if (!accessMap.has(access.profile_id)) accessMap.set(access.profile_id, [])
          accessMap.get(access.profile_id)!.push(access.user_email)
          allCounseleeEmails.add(access.user_email)
        })
      }
    }

    if (allUserIds.size > 0) {
      const { data: userProfiles } = await clientForLookups
        .from('user_profiles')
        .select('id, username')
        .in('id', Array.from(allUserIds))
      if (userProfiles) {
        userProfiles.forEach((up: { id: string; username: string | null }) => {
          usernameMap.set(up.id, up.username || '')
        })
      }
    }

    if (allCounseleeEmails.size > 0) {
      const adminAuth = createAdminClient()
      const { data: authData, error: authError } = await adminAuth.auth.admin.listUsers()
      if (authError) {
        logger.error('[API] GET /api/profiles/templates listUsers', { error: authError })
      } else if (authData?.users) {
        const emailToIdMap = new Map<string, string>()
        authData.users.forEach((u: { email?: string; id: string }) => {
          if (u.email) emailToIdMap.set(u.email, u.id)
        })
        const counseleeIds = Array.from(allCounseleeEmails)
          .map((email) => emailToIdMap.get(email))
          .filter(Boolean) as string[]
        if (counseleeIds.length > 0) {
          const { data: userProfiles, error: upErr } = await clientForLookups
            .from('user_profiles')
            .select('id, username')
            .in('id', counseleeIds)
          if (upErr) {
            logger.error('[API] GET /api/profiles/templates counselee usernames', { error: upErr })
          } else if (userProfiles) {
            userProfiles.forEach((up: { id: string; username: string | null }) => {
              const email = Array.from(emailToIdMap.entries()).find(([, id]) => id === up.id)?.[0]
              if (email) usernameMap.set(email, up.username || '')
            })
          }
        }
      }
    }

    const profiles = data.map((row) => mapRowToListItem(row as Record<string, unknown>, usernameMap, accessMap))

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
