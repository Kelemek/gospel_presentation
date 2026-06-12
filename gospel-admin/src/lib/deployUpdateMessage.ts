import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'

export const DEPLOY_UPDATE_MESSAGE_MAX_LENGTH = 400

const DATA_DIR = path.join(process.cwd(), 'data')

const DEPLOY_UPDATE_MESSAGE_FILE = path.join(DATA_DIR, 'deploy-update-message.txt')

const DEPLOY_UPDATE_CHANGELOG_FILE = path.join(DATA_DIR, 'deploy-update-changelog.json')

/** User-visible body from deploy-update-message.txt (comments and blank lines omitted). */
export function parseDeployUpdateMessageFileContent(raw: string): string | null {
  const body = raw
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')
    .trim()

  if (!body) return null

  if (body.length <= DEPLOY_UPDATE_MESSAGE_MAX_LENGTH) {
    return body
  }

  return `${body.slice(0, DEPLOY_UPDATE_MESSAGE_MAX_LENGTH - 1).trimEnd()}…`
}

export function readDeployUpdateMessage(): string | null {
  try {
    if (!fs.existsSync(DEPLOY_UPDATE_MESSAGE_FILE)) {
      return null
    }

    const raw = fs.readFileSync(DEPLOY_UPDATE_MESSAGE_FILE, 'utf8')
    const message = parseDeployUpdateMessageFileContent(raw)
    if (message && message.endsWith('…')) {
      logger.warn('Deploy update message truncated to fit native alert limit')
    }
    return message
  } catch (error) {
    logger.warn('Failed to read deploy update message file', error)
    return null
  }
}

function parseDeployUpdateChangelogFileContent(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

/** Persisted user-facing release notes (oldest first). Append when shipping a user-visible release. */
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

/**
 * Changelog for the API: persisted entries plus the current deploy-update-message.txt body when it
 * is not already the latest entry (so a release only needs the txt file until the next deploy).
 */
export function resolveDeployUpdateChangelog(): string[] {
  const changelog = readDeployUpdateChangelog()
  const currentMessage = readDeployUpdateMessage()
  if (!currentMessage) return changelog

  const latest = changelog[changelog.length - 1]
  if (latest === currentMessage) return changelog

  return [...changelog, currentMessage]
}
