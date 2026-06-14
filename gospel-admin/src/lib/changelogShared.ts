/** Max length for release notes in What's new and Help → Change log. */
export const RELEASE_CHANGELOG_ENTRY_MAX_LENGTH = 400

export function truncateReleaseChangelogMessage(message: string): string {
  if (message.length <= RELEASE_CHANGELOG_ENTRY_MAX_LENGTH) {
    return message
  }
  return `${message.slice(0, RELEASE_CHANGELOG_ENTRY_MAX_LENGTH - 1).trimEnd()}…`
}
