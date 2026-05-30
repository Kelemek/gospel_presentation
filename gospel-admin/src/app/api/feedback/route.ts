import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  createGitHubIssue,
  isFeedbackType,
  isGitHubFeedbackConfigured,
  isValidFeedbackEmail,
  normalizeFeedbackEmail,
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
      email?: unknown
      pageUrl?: unknown
      profileSlug?: unknown
      profileTitle?: unknown
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const type = body.type
    const formEmail = normalizeFeedbackEmail(body.email)

    if (!title || !description || !isFeedbackType(type)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    if (title.length > MAX_TITLE_LEN || description.length > MAX_DESCRIPTION_LEN) {
      return NextResponse.json({ error: 'Title or description is too long' }, { status: 400 })
    }
    if (formEmail && !isValidFeedbackEmail(formEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
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

    const userEmail = formEmail

    const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim() : null
    const profileSlug = typeof body.profileSlug === 'string' ? body.profileSlug.trim() : null
    const profileTitle = typeof body.profileTitle === 'string' ? body.profileTitle.trim() : null

    const result = await createGitHubIssue(config, {
      title,
      description,
      type,
      userEmail,
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
