import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'

export const DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH = 400

const DEPLOY_UPDATE_CHANGELOG_FILE = path.join(
  process.cwd(),
  'data',
  'deploy-update-changelog.json'
)

function truncateDeployUpdateChangelogEntry(entry: string): string {
  if (entry.length <= DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH) {
    return entry
  }
  logger.warn('Deploy update changelog entry truncated to fit alert limit')
  return `${entry.slice(0, DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH - 1).trimEnd()}…`
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
