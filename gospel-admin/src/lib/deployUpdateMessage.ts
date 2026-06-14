import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'
import {
  RELEASE_CHANGELOG_ENTRY_MAX_LENGTH,
  truncateReleaseChangelogMessage,
} from '@/lib/changelogShared'

/** @deprecated Prefer RELEASE_CHANGELOG_ENTRY_MAX_LENGTH from changelogShared */
export const DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH = RELEASE_CHANGELOG_ENTRY_MAX_LENGTH

const DEPLOY_UPDATE_CHANGELOG_FILE = path.join(
  process.cwd(),
  'data',
  'deploy-update-changelog.json'
)

function truncateDeployUpdateChangelogEntry(entry: string): string {
  const truncated = truncateReleaseChangelogMessage(entry)
  if (truncated !== entry) {
    logger.warn('Deploy update changelog entry truncated to fit alert limit')
  }
  return truncated
}

function parseDeployUpdateChangelogFileContent(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => truncateDeployUpdateChangelogEntry(entry))
  } catch {
    return []
  }
}

/** User-facing release notes (oldest first). Append one string per user-visible release. */
export function readDeployUpdateChangelog(): string[] {
  try {
    if (!fs.existsSync(DEPLOY_UPDATE_CHANGELOG_FILE)) {
      return []
    }

    const raw = fs.readFileSync(DEPLOY_UPDATE_CHANGELOG_FILE, 'utf8')
    return parseDeployUpdateChangelogFileContent(raw)
  } catch (error) {
    logger.warn('Failed to read deploy update changelog file', error)
    return []
  }
}

function writeDeployUpdateChangelog(entries: string[]): void {
  fs.writeFileSync(
    DEPLOY_UPDATE_CHANGELOG_FILE,
    `${JSON.stringify(entries, null, 2)}\n`,
    'utf8'
  )
}

/** Append one release note (oldest first). Same text should go to site-changelog.json via appendReleaseChangelog. */
export function appendDeployUpdateChangelogEntry(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error('Release note message is required')
  }
  const entry = truncateDeployUpdateChangelogEntry(trimmed)
  const entries = readDeployUpdateChangelog()
  entries.push(entry)
  writeDeployUpdateChangelog(entries)
  return entry
}
