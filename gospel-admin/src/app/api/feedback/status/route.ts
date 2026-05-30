import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isGitHubFeedbackConfigured, normalizeGitHubFeedbackConfig } from '@/lib/githubFeedback'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_settings')
      .select('github_feedback_enabled, github_token, github_repo_owner, github_repo_name')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      logger.error('[feedback/status] Failed to load config:', error)
      return NextResponse.json({ enabled: false })
    }

    const config = normalizeGitHubFeedbackConfig(data)
    return NextResponse.json({ enabled: isGitHubFeedbackConfigured(config) })
  } catch (error) {
    logger.error('[feedback/status] Unexpected error:', error)
    return NextResponse.json({ enabled: false })
  }
}
