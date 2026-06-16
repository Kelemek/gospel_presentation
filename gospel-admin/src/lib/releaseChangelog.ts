import { appendDeployUpdateChangelogEntry } from '@/lib/deployUpdateMessage'
import { appendSiteChangelogEntry, type SiteChangelogEntry } from '@/lib/siteChangelog'

export type AppendReleaseChangelogResult = {
  deployMessage: string
  siteEntry: SiteChangelogEntry
}

/**
 * Append the same user-facing note to deploy-update-changelog.json and site-changelog.json.
 * Deploy JSON is append-only (full history); UI shows at most five unseen notes per alert.
 */
export function appendReleaseChangelog(message: string): AppendReleaseChangelogResult {
  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error('Release note message is required')
  }

  const deployMessage = appendDeployUpdateChangelogEntry(trimmed)
  const siteEntry = appendSiteChangelogEntry(deployMessage)
  return { deployMessage, siteEntry }
}
