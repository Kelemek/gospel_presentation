import fs from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'

export const DEPLOY_UPDATE_MESSAGE_MAX_LENGTH = 400

const DEPLOY_UPDATE_MESSAGE_FILE = path.join(
  process.cwd(),
  'data',
  'deploy-update-message.txt'
)

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
