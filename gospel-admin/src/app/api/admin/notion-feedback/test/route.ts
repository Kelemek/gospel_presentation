import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'
import {
  createNotionTestRow,
  isNotionFeedbackTestAction,
  NOTION_FEEDBACK_COLUMNS,
  normalizeNotionId,
  resolveNotionFeedbackConfig,
  testNotionConnection,
} from '@/lib/notionFeedback'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      action?: unknown
      notion_token?: unknown
      notion_database_id?: unknown
    }

    const action = isNotionFeedbackTestAction(body.action) ? body.action : 'connection'
    let token = typeof body.notion_token === 'string' ? body.notion_token.trim() : ''
    let databaseId = typeof body.notion_database_id === 'string' ? normalizeNotionId(body.notion_database_id) : ''

    if (!token || !databaseId) {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('admin_settings')
        .select(NOTION_FEEDBACK_COLUMNS)
        .eq('id', 1)
        .maybeSingle()

      if (error) {
        logger.error('[admin/notion-feedback/test] Failed to load config:', error)
        return NextResponse.json({ error: 'Failed to load Notion feedback settings' }, { status: 500 })
      }

      const config = resolveNotionFeedbackConfig(data)
      token = token || config.notion_token || ''
      databaseId = databaseId || config.notion_database_id
    }

    switch (action) {
      case 'connection': {
        const result = await testNotionConnection(token, databaseId)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
      }
      case 'create': {
        const result = await createNotionTestRow(token, databaseId)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
      }
      default: {
        const _exhaustive: never = action
        return NextResponse.json({ error: `Unsupported test action: ${_exhaustive}` }, { status: 400 })
      }
    }
  } catch (error) {
    logger.error('[admin/notion-feedback/test] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
