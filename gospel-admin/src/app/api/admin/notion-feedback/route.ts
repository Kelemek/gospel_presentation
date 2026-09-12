import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import {
  DEFAULT_NOTION_DATABASE_ID,
  maskNotionToken,
  NOTION_FEEDBACK_COLUMNS,
  normalizeNotionId,
  resolveNotionFeedbackConfig,
} from '@/lib/notionFeedback'
import { logger } from '@/lib/logger'

type AdminSettingsUpdate = Database['public']['Tables']['admin_settings']['Update']

function publicSettingsPayload(
  enabled: boolean,
  databaseId: string,
  storedToken: string | null,
  env: NodeJS.Dict<string> = process.env
) {
  const resolved = resolveNotionFeedbackConfig(
    {
      notion_feedback_enabled: enabled,
      notion_token: storedToken,
      notion_database_id: databaseId,
    },
    env
  )
  return {
    notion_feedback_enabled: enabled,
    notion_database_id: databaseId || DEFAULT_NOTION_DATABASE_ID,
    notion_token_masked: maskNotionToken(storedToken) || (resolved.token_from_env ? 'env' : ''),
    has_notion_token: Boolean(resolved.notion_token),
    token_from_env: resolved.token_from_env,
  }
}

export async function GET() {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_settings')
      .select(NOTION_FEEDBACK_COLUMNS)
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      logger.error('[admin/notion-feedback] Failed to load config:', error)
      return NextResponse.json({ error: 'Failed to load Notion feedback settings' }, { status: 500 })
    }

    const storedToken = data?.notion_token?.trim() || null
    const storedDatabaseId = data?.notion_database_id ? normalizeNotionId(data.notion_database_id) : ''
    return NextResponse.json(
      publicSettingsPayload(data?.notion_feedback_enabled === true, storedDatabaseId, storedToken)
    )
  } catch (error) {
    logger.error('[admin/notion-feedback] Unexpected GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      notion_feedback_enabled?: unknown
      notion_database_id?: unknown
      notion_token?: unknown
    }

    if (typeof body.notion_feedback_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const notion_database_id =
      typeof body.notion_database_id === 'string' ? normalizeNotionId(body.notion_database_id) : ''
    const notion_token = typeof body.notion_token === 'string' ? body.notion_token.trim() : ''

    const admin = createAdminClient()
    const { data: existing, error: loadError } = await admin
      .from('admin_settings')
      .select(NOTION_FEEDBACK_COLUMNS)
      .eq('id', 1)
      .maybeSingle()

    if (loadError) {
      logger.error('[admin/notion-feedback] Failed to load existing config:', loadError)
      return NextResponse.json({ error: 'Failed to save Notion feedback settings' }, { status: 500 })
    }

    const currentToken = existing?.notion_token?.trim() || null
    const updatePayload: AdminSettingsUpdate = {
      notion_feedback_enabled: body.notion_feedback_enabled,
      notion_database_id,
      updated_at: new Date().toISOString(),
      notion_token: notion_token || currentToken,
    }

    const { error: updateError } = await (admin.from('admin_settings') as { update: (payload: AdminSettingsUpdate) => { eq: (column: string, value: number) => Promise<{ error: unknown }> } })
      .update(updatePayload)
      .eq('id', 1)

    if (updateError) {
      logger.error('[admin/notion-feedback] Failed to save config:', updateError)
      return NextResponse.json({ error: 'Failed to save Notion feedback settings' }, { status: 500 })
    }

    const savedToken = updatePayload.notion_token ?? null
    return NextResponse.json({
      success: true,
      ...publicSettingsPayload(body.notion_feedback_enabled, notion_database_id, savedToken),
    })
  } catch (error) {
    logger.error('[admin/notion-feedback] Unexpected PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
