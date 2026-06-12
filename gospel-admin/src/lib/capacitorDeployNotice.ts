import {
  getSeenChangelogCount,
  setAcknowledgedDeployVersion,
  setSeenChangelogCount,
} from '@/lib/capacitorAppDeployVersion'

const CAPACITOR_RESTART_APP_INSTRUCTIONS =
  'A new version of the app is available. Please close the Gospel Presentation app completely (swipe it away from the app switcher), then open it again.'

/** Shown when the server has a newer deploy than this WebView session started with. */
export const CAPACITOR_RESTART_APP_NOTICE = buildCapacitorRestartAppNotice()

export const CAPACITOR_WHATS_NEW_NOTICE_MAX_LENGTH = 1200

/** Compose restart alert with release notes the user has not seen yet. */
export function buildCapacitorRestartAppNotice(unseenMessages?: string[] | null): string {
  const body = formatCapacitorWhatsNewBody(unseenMessages ?? [])
  if (!body) {
    return `Update available\n\n${CAPACITOR_RESTART_APP_INSTRUCTIONS}`
  }
  return `Update available\n\nWhat has changed:\n\n${body}\n\n${CAPACITOR_RESTART_APP_INSTRUCTIONS}`
}

/** Format one or more missed release notes for users who open the app after an update. */
export function formatCapacitorWhatsNewBody(messages: string[]): string | null {
  const entries = messages.map((message) => message.trim()).filter(Boolean)
  if (!entries.length) return null

  const body =
    entries.length === 1
      ? entries[0]
      : entries.map((message, index) => `${index + 1}. ${message}`).join('\n\n')

  if (body.length <= CAPACITOR_WHATS_NEW_NOTICE_MAX_LENGTH) {
    return body
  }

  return `${body.slice(0, CAPACITOR_WHATS_NEW_NOTICE_MAX_LENGTH - 1).trimEnd()}…`
}

export function buildCapacitorWhatsNewNotice(messages: string[]): string | null {
  const body = formatCapacitorWhatsNewBody(messages)
  if (!body) return null
  return `What's new\n\n${body}`
}

export function acknowledgeCapacitorDeployChangelog(
  changelog: string[],
  remoteVersion: string
): void {
  setSeenChangelogCount(Math.max(getSeenChangelogCount(), changelog.length))
  setAcknowledgedDeployVersion(remoteVersion)
}

export const CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY = 'gospel-capacitor-deploy-notice-for'

export const CAPACITOR_WHATS_NEW_NOTICE_SHOWN_SESSION_KEY =
  'gospel-capacitor-whats-new-shown-session'

export function shouldShowCapacitorDeployNotice(remoteVersion: string): boolean {
  if (typeof sessionStorage === 'undefined') return true
  try {
    return sessionStorage.getItem(CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY) !== remoteVersion
  } catch {
    return true
  }
}

export function markCapacitorDeployNoticeShown(remoteVersion: string): void {
  try {
    sessionStorage.setItem(CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY, remoteVersion)
  } catch {
    // private mode / quota
  }
}

export function shouldShowCapacitorWhatsNewOnColdStart(): boolean {
  if (typeof sessionStorage === 'undefined') return true
  try {
    return sessionStorage.getItem(CAPACITOR_WHATS_NEW_NOTICE_SHOWN_SESSION_KEY) !== '1'
  } catch {
    return true
  }
}

export function markCapacitorWhatsNewShownThisSession(): void {
  try {
    sessionStorage.setItem(CAPACITOR_WHATS_NEW_NOTICE_SHOWN_SESSION_KEY, '1')
  } catch {
    // private mode / quota
  }
}
