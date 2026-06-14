/**
 * Append the same release note to deploy-update-changelog.json and site-changelog.json.
 *
 * Usage (from gospel-admin/):
 *   npm run append-release-changelog -- "Open Help (?), then Change log to browse what's new."
 */
import { appendReleaseChangelog } from '../src/lib/releaseChangelog'

function main() {
  const message = process.argv.slice(2).join(' ').trim()
  if (!message) {
    process.stderr.write(
      'Usage: npm run append-release-changelog -- "Your plain-language release note."\n'
    )
    process.exit(1)
  }

  const { deployMessage, siteEntry } = appendReleaseChangelog(message)
  process.stdout.write(
    `Appended release note to deploy and site changelogs (${siteEntry.releasedAt}): ${deployMessage}\n`
  )
}

main()
