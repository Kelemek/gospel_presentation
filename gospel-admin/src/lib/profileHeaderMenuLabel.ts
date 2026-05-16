/**
 * Minimum viewport width (px) for showing the word "Menu" beside the hamburger on profile pages
 * when **Listen** is shown (non-Android and Android Chrome where the speaker control exists).
 */
export const PROFILE_MENU_LABEL_MIN_VIEWPORT_PX = 390

/**
 * Same as {@link PROFILE_MENU_LABEL_MIN_VIEWPORT_PX}, but lower because **Listen** is omitted on
 * Android (`ProfileResourceReadAloud`), leaving more room in the header toolbar.
 */
export const PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX = 360

export function profileMenuLabelMinViewportPx(isAndroidUserAgent: boolean): number {
  return isAndroidUserAgent ? PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX : PROFILE_MENU_LABEL_MIN_VIEWPORT_PX
}

export function showProfileMenuLabelForViewport(
  viewportInnerWidth: number,
  isAndroidUserAgent = false
): boolean {
  return viewportInnerWidth >= profileMenuLabelMinViewportPx(isAndroidUserAgent)
}
