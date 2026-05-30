import { logger } from '@/lib/logger'

export type FeedbackType = 'suggestion' | 'feature' | 'bug'

export interface GitHubFeedbackConfig {
  github_feedback_enabled: boolean
  github_token: string | null
  github_repo_owner: string
  github_repo_name: string
}

export interface CreateFeedbackPayload {
  title: string
  description: string
  type: FeedbackType
  userEmail?: string | null
  pageUrl?: string | null
  profileSlug?: string | null
  profileTitle?: string | null
}

export interface GitHubFeedbackConfigRow {
  github_feedback_enabled?: boolean | null
  github_token?: string | null
  github_repo_owner?: string | null
  github_repo_name?: string | null
}

const FETCH_TIMEOUT_MS = 10_000
const MAX_FEEDBACK_EMAIL_LEN = 254
const FEEDBACK_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const TYPE_EMOJI: Record<FeedbackType, string> = {
  bug: '🐛',
  feature: '✨',
  suggestion: '💡',
}

export function isFeedbackType(value: unknown): value is FeedbackType {
  return value === 'suggestion' || value === 'feature' || value === 'bug'
}

export function normalizeFeedbackEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toLowerCase()
}

export function isValidFeedbackEmail(email: string): boolean {
  return email.length <= MAX_FEEDBACK_EMAIL_LEN && FEEDBACK_EMAIL_RE.test(email)
}

export function normalizeGitHubFeedbackConfig(row: GitHubFeedbackConfigRow | null): GitHubFeedbackConfig {
  return {
    github_feedback_enabled: row?.github_feedback_enabled === true,
    github_token: row?.github_token?.trim() || null,
    github_repo_owner: row?.github_repo_owner?.trim() || '',
    github_repo_name: row?.github_repo_name?.trim() || '',
  }
}

export function isGitHubFeedbackConfigured(config: GitHubFeedbackConfig): boolean {
  return Boolean(
    config.github_feedback_enabled &&
      config.github_token &&
      config.github_repo_owner &&
      config.github_repo_name
  )
}

export function maskGitHubToken(token: string | null | undefined): string {
  if (!token?.trim()) return ''
  const trimmed = token.trim()
  if (trimmed.length <= 8) return '****'
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`
}

export function formatFeedbackIssueBody(payload: CreateFeedbackPayload): string {
  const emailLabel = normalizeFeedbackEmail(payload.userEmail) ?? 'Anonymous'
  const contextLines: string[] = []
  if (payload.profileSlug) {
    contextLines.push(`**Profile:** ${payload.profileTitle?.trim() || payload.profileSlug} (\`/${payload.profileSlug}\`)`)
  }
  if (payload.pageUrl?.trim()) {
    contextLines.push(`**Page URL:** ${payload.pageUrl.trim()}`)
  }

  const contextBlock = contextLines.length > 0 ? `\n${contextLines.join('\n')}\n` : '\n'

  return `
**Type:** ${payload.type}
**User Email:** ${emailLabel}
${contextBlock}
---

${payload.description.trim()}

_This issue was automatically created from the feedback form._
`.trim()
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function createGitHubIssue(
  config: GitHubFeedbackConfig,
  payload: CreateFeedbackPayload
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  if (!isGitHubFeedbackConfigured(config)) {
    return { success: false, error: 'GitHub feedback is not configured' }
  }

  const owner = config.github_repo_owner
  const repo = config.github_repo_name
  const token = config.github_token as string

  try {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `${TYPE_EMOJI[payload.type]} ${payload.title.trim()}`,
        body: formatFeedbackIssueBody(payload),
        labels: [payload.type],
      }),
    })

    if (!response.ok) {
      let message = 'Failed to create GitHub issue'
      try {
        const errorData = (await response.json()) as { message?: string }
        if (errorData.message) message = errorData.message
      } catch {
        // ignore parse errors
      }
      logger.error('[githubFeedback] GitHub API error:', message)
      return { success: false, error: message }
    }

    const issue = (await response.json()) as { html_url?: string }
    return { success: true, url: issue.html_url || '' }
  } catch (err) {
    logger.error('[githubFeedback] Exception creating issue:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function testGitHubConnection(
  token: string,
  owner: string,
  repo: string
): Promise<{ success: boolean; message: string }> {
  if (!token.trim()) {
    return { success: false, message: 'GitHub token is not configured' }
  }
  if (!owner.trim() || !repo.trim()) {
    return { success: false, message: 'Repository owner and name are required' }
  }

  try {
    const response = await fetchWithTimeout(
      `https://api.github.com/repos/${owner.trim()}/${repo.trim()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `token ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      let message = 'Failed to access repository'
      try {
        const errorData = (await response.json()) as { message?: string }
        if (errorData.message) message = errorData.message
      } catch {
        // ignore parse errors
      }
      return { success: false, message }
    }

    return { success: true, message: 'Successfully connected to GitHub repository' }
  } catch (err) {
    logger.error('[githubFeedback] Connection test error:', err)
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
