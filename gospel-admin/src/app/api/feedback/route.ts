import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  createGitHubIssue,
  isFeedbackType,
  isGitHubFeedbackConfigured,
  normalizeGitHubFeedbackConfig,
} from '@/lib/githubFeedback'
import { logger } from '@/lib/logger'

const MAX_TITLE_LEN = 100
const MAX_DESCRIPTION_LEN = 1000

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title?: unknown
      description?: unknown
      type?: unknown
      pageUrl?: unknown
      profileSlug?: unknown
      profileTitle?: unknown
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const type = body.type

    if (!title || !description || !isFeedbackType(type)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    if (title.length > MAX_TITLE_LEN || description.length > MAX_DESCRIPTION_LEN) {
      return NextResponse.json({ error: 'Title or description is too long' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_settings')
      .select('github_feedback_enabled, github_token, github_repo_owner, github_repo_name')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      logger.error('[feedback] Failed to load config:', error)
      return NextResponse.json({ error: 'Feedback is unavailable' }, { status: 503 })
    }

    const config = normalizeGitHubFeedbackConfig(data)
    if (!isGitHubFeedbackConfigured(config)) {
      return NextResponse.json({ error: 'Feedback is not enabled' }, { status: 503 })
    }

    let userEmail: string | null = null
    let userName: string | null = null
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        userEmail = user.email ?? null
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('username, full_name')
          .eq('id', user.id)
          .maybeSingle()
        const row = profile as { username?: string | null; full_name?: string | null } | null
        userName = row?.full_name?.trim() || row?.username?.trim() || userEmail
      }
    } catch {
      // optional auth context
    }

    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim() : null
    const profileSlug = typeof body.profileSlug === 'string' ? body.profileSlug.trim() : null
    const profileTitle = typeof body.profileTitle === 'string' ? body.profileTitle.trim() : null

    const result = await createGitHubIssue(config, {
      title,
      description,
      type,
      userEmail,
      userName,
      pageUrl,
      profileSlug,
      profileTitle,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    logger.error('[feedback] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
