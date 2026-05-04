import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { logger } from '@/lib/logger'

/**
 * postgrest-js requires `Database['public']` to extend `GenericSchema` (tables need `Relationships`, etc.).
 * This repo’s hand-maintained `Database` type does not, so `rpc` would otherwise infer `args` as `undefined`.
 * Cast only for this RPC call site.
 */
type SpurgeonPublicSermonsRpcDatabase = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: {
      spurgeon_public_sermons_page: {
        Args: { p_q: string | null; p_offset: number; p_limit: number }
        Returns: Json
      }
    }
    Enums: Record<string, never>
  }
}

type SermonsRpcPayload = { total: number; items: { slug: string; title: string }[] }

function rpcTotalNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return parseInt(v, 10)
  return null
}

function isSermonsRpcPayload(v: unknown): v is SermonsRpcPayload {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (rpcTotalNumber(o.total) === null || !Array.isArray(o.items)) return false
  return o.items.every((row) => {
    if (!row || typeof row !== 'object') return false
    const r = row as { slug?: unknown; title?: unknown }
    if (typeof r.slug !== 'string') return false
    return typeof r.title === 'string' || r.title === null
  })
}

/**
 * GET /api/spurgeon/sermons?q=&page=&pageSize=
 * Public sermon templates: is_template, is_public, slug prefix sg.
 * Ordering and pagination use DB RPC `spurgeon_public_sermons_page` (A–Z by display title; leading `Sermon N.` stripped, same rule as `spurgeonSermonTitleForModalDisplay`).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ = (searchParams.get('q') || '').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(1000, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20))
    const from = (page - 1) * pageSize

    const stripped = rawQ
      .replace(/%/g, '')
      .replace(/_/g, '')
      .replace(/,/g, '')
      .replace(/"/g, '')
      .trim()

    const admin = createAdminClient() as unknown as SupabaseClient<SpurgeonPublicSermonsRpcDatabase>
    const { data, error } = await admin.rpc('spurgeon_public_sermons_page', {
      p_q: stripped.length > 0 ? stripped : null,
      p_offset: from,
      p_limit: pageSize,
    })

    if (error) {
      logger.error('[API] GET /api/spurgeon/sermons supabase error', { error })
      return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
    }

    if (!isSermonsRpcPayload(data)) {
      logger.error('[API] GET /api/spurgeon/sermons unexpected RPC shape', { data })
      return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
    }

    const total = rpcTotalNumber(data.total) ?? 0
    const pageRows = data.items.map((r) => ({ slug: r.slug, title: r.title || r.slug }))

    return NextResponse.json({
      items: pageRows,
      total,
      page,
      pageSize,
    })
  } catch (e) {
    logger.error('[API] GET /api/spurgeon/sermons', e)
    return NextResponse.json({ error: 'Failed to load sermons' }, { status: 500 })
  }
}
