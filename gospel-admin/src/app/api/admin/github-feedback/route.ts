import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
import { maskGitHubToken, normalizeGitHubFeedbackConfig } from '@/lib/githubFeedback'
import { logger } from '@/lib/logger'

type AdminSettingsUpdate = Database['public']['Tables']['admin_settings']['Update']

const GITHUB_FEEDBACK_COLUMNS =
  'github_feedback_enabled, github_token, github_repo_owner, github_repo_name'

export async function GET() {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_settings')
      .select(GITHUB_FEEDBACK_COLUMNS)
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      logger.error('[admin/github-feedback] Failed to load config:', error)
      return NextResponse.json({ error: 'Failed to load GitHub feedback settings' }, { status: 500 })
    }

    const config = normalizeGitHubFeedbackConfig(data)
    return NextResponse.json({
      github_feedback_enabled: config.github_feedback_enabled,
      github_repo_owner: config.github_repo_owner,
      github_repo_name: config.github_repo_name,
      github_token_masked: maskGitHubToken(config.github_token),
      has_github_token: Boolean(config.github_token),
    })
  } catch (error) {
    logger.error('[admin/github-feedback] Unexpected GET error:', error)
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
      github_feedback_enabled?: unknown
      github_repo_owner?: unknown
      github_repo_name?: unknown
      github_token?: unknown
    }

    if (typeof body.github_feedback_enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const github_repo_owner =
      typeof body.github_repo_owner === 'string' ? body.github_repo_owner.trim() : ''
    const github_repo_name =
      typeof body.github_repo_name === 'string' ? body.github_repo_name.trim() : ''
    const github_token =
      typeof body.github_token === 'string' ? body.github_token.trim() : ''

    const admin = createAdminClient()
    const { data: existing, error: loadError } = await admin
      .from('admin_settings')
      .select(GITHUB_FEEDBACK_COLUMNS)
      .eq('id', 1)
      .maybeSingle()

    if (loadError) {
      logger.error('[admin/github-feedback] Failed to load existing config:', loadError)
      return NextResponse.json({ error: 'Failed to save GitHub feedback settings' }, { status: 500 })
    }

    const current = normalizeGitHubFeedbackConfig(existing)
    const updatePayload: AdminSettingsUpdate = {
      github_feedback_enabled: body.github_feedback_enabled,
      github_repo_owner,
      github_repo_name,
      updated_at: new Date().toISOString(),
      github_token: github_token || current.github_token,
    }

    const { error: updateError } = await (admin.from('admin_settings') as any)
      .update(updatePayload)
      .eq('id', 1)

    if (updateError) {
      logger.error('[admin/github-feedback] Failed to save config:', updateError)
      return NextResponse.json({ error: 'Failed to save GitHub feedback settings' }, { status: 500 })
    }

    const savedToken = updatePayload.github_token ?? null
    return NextResponse.json({
      success: true,
      github_feedback_enabled: body.github_feedback_enabled,
      github_repo_owner,
      github_repo_name,
      github_token_masked: maskGitHubToken(savedToken),
      has_github_token: Boolean(savedToken),
    })
  } catch (error) {
    logger.error('[admin/github-feedback] Unexpected PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
