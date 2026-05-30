import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/adminAuth'
import { createAdminClient } from '@/lib/supabase/server'
import { normalizeGitHubFeedbackConfig, testGitHubConnection } from '@/lib/githubFeedback'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = (await request.json()) as {
      github_token?: unknown
      github_repo_owner?: unknown
      github_repo_name?: unknown
    }

    let token = typeof body.github_token === 'string' ? body.github_token.trim() : ''
    let owner = typeof body.github_repo_owner === 'string' ? body.github_repo_owner.trim() : ''
    let repo = typeof body.github_repo_name === 'string' ? body.github_repo_name.trim() : ''

    if (!token || !owner || !repo) {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('admin_settings')
        .select('github_token, github_repo_owner, github_repo_name')
        .eq('id', 1)
        .maybeSingle()

      if (error) {
        logger.error('[admin/github-feedback/test] Failed to load config:', error)
        return NextResponse.json({ error: 'Failed to load GitHub feedback settings' }, { status: 500 })
      }

      const config = normalizeGitHubFeedbackConfig(data)
      token = token || config.github_token || ''
      owner = owner || config.github_repo_owner
      repo = repo || config.github_repo_name
    }

    const result = await testGitHubConnection(token, owner, repo)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    logger.error('[admin/github-feedback/test] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
