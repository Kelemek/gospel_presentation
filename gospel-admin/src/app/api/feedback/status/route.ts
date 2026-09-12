import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  isNotionFeedbackConfigured,
  NOTION_FEEDBACK_COLUMNS,
  resolveNotionFeedbackConfig,
} from '@/lib/notionFeedback'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_settings')
      .select(NOTION_FEEDBACK_COLUMNS)
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      logger.error('[feedback/status] Failed to load config:', error)
      return NextResponse.json({ enabled: false })
    }

    const config = resolveNotionFeedbackConfig(data)
    return NextResponse.json({ enabled: isNotionFeedbackConfigured(config) })
  } catch (error) {
    logger.error('[feedback/status] Unexpected error:', error)
    return NextResponse.json({ enabled: false })
  }
}
