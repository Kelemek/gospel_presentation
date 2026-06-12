/** Shown when the server has a newer deploy than this WebView session started with. */
export const CAPACITOR_RESTART_APP_NOTICE =
  'Update available\n\nA new version is on the server. Please close the Gospel Presentation app completely (swipe it away from the app switcher), then open it again.'

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
