/**
 * Turn conventional commit subjects into user-facing changelog lines.
 * Used by the one-time git backfill script; not for runtime git access.
 */

const CONVENTIONAL_PREFIX =
  /^(feat|fix|refactor|chore|docs|test|ci|build|style|perf)(\([^)]+\))?!?:\s*/i

const SKIP_SUBJECT_PATTERNS: RegExp[] = [
  /^update tests?\b/i,
  /^add tests?\b/i,
  /^fix tests?\b/i,
  /^lint\b/i,
  /^knip\b/i,
  /^bump\b/i,
  /^merge\b/i,
  /deploy update (notice|changelog|messaging)/i,
  /changelog handling/i,
  /deploy-update-changelog/i,
]

/** Returns null when the commit should not appear in the public site changelog. */
export function commitSubjectToChangelogMessage(
  subject: string,
  type?: 'feat' | 'fix' | 'other'
): string | null {
  const trimmed = subject.trim()
  if (!trimmed) return null

  for (const pattern of SKIP_SUBJECT_PATTERNS) {
    if (pattern.test(trimmed)) return null
  }

  let body = trimmed.replace(CONVENTIONAL_PREFIX, '').trim()
  if (!body) return null

  body = humanizeChangelogBody(body)

  const isFix =
    type === 'fix' ||
    (type === undefined && /^fix(\(|!|:)/i.test(trimmed))

  if (isFix) {
    if (body.startsWith('Bug fix:')) return body
    return `Bug fix: ${body.charAt(0).toUpperCase()}${body.slice(1)}`
  }

  return body.charAt(0).toUpperCase() + body.slice(1)
}

export function parseConventionalCommitType(
  subject: string
): 'feat' | 'fix' | 'other' | null {
  const m = /^(feat|fix)(\([^)]+\))?!?:\s*/i.exec(subject.trim())
  if (!m) return null
  const kind = m[1].toLowerCase()
  if (kind === 'feat') return 'feat'
  if (kind === 'fix') return 'fix'
  return 'other'
}

/** Whether a commit subject is a user-visible feat/fix for the site changelog. */
export function isUserVisibleGospelAdminCommit(subject: string): boolean {
  const trimmed = subject.trim()
  if (!/^(feat|fix)(\([^)]+\))?!?:/i.test(trimmed)) return false
  return commitSubjectToChangelogMessage(trimmed) !== null
}

function humanizeChangelogBody(body: string): string {
  const text = body
    .replace(/\bWebView\b/gi, 'app')
    .replace(/\bCapacitor\b/gi, 'mobile app')
    .replace(/\bIndexedDB\b/gi, 'offline storage')
    .replace(/\blocalStorage\b/gi, 'device storage')
    .replace(/\bPostHog\b/gi, 'analytics')
    .replace(/\bSupabase\b/gi, 'account')
    .replace(/\bESLint\b/gi, '')
    .replace(/\bJest\b/gi, '')
    .replace(/\bCI\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (text.endsWith('.')) return text
  return `${text}.`
}
