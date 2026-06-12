const CAPACITOR_RESTART_APP_INSTRUCTIONS =
  'A new version of the app is available. Please close the Gospel Presentation app completely (swipe it away from the app switcher), then open it again.'

/** Shown when the server has a newer deploy than this WebView session started with. */
export const CAPACITOR_RESTART_APP_NOTICE = buildCapacitorRestartAppNotice()

/** Compose native restart alert with optional user-facing changelog from deploy-update-message.txt. */
export function buildCapacitorRestartAppNotice(optionalMessage?: string | null): string {
  const changelog = optionalMessage?.trim()
  if (!changelog) {
    return `Update available\n\n${CAPACITOR_RESTART_APP_INSTRUCTIONS}`
  }
  return `Update available\n\nWhat has changed:\n\n${changelog}\n\n${CAPACITOR_RESTART_APP_INSTRUCTIONS}`
}

export const CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY = 'gospel-capacitor-deploy-notice-for'

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
