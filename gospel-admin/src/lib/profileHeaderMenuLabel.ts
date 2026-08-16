/**
 * Minimum viewport width (px) for showing the word "Menu" beside the hamburger on profile pages
 * when **Listen** is shown (iOS, desktop, Android Chrome, and native Android with the speech plugin).
 */
export const PROFILE_MENU_LABEL_MIN_VIEWPORT_PX = 390

/**
 * Same as {@link PROFILE_MENU_LABEL_MIN_VIEWPORT_PX}, but lower because **Listen** is omitted
 * (native Android without the speech plugin), leaving more room in the header toolbar.
 * Pass `true` only when the compact header applies — not for every Android user agent.
 */
export const PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX = 360

export function profileMenuLabelMinViewportPx(useCompactAndroidHeader: boolean): number {
  return useCompactAndroidHeader
    ? PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX
    : PROFILE_MENU_LABEL_MIN_VIEWPORT_PX
}

export function showProfileMenuLabelForViewport(
  viewportInnerWidth: number,
  useCompactAndroidHeader = false
): boolean {
  return viewportInnerWidth >= profileMenuLabelMinViewportPx(useCompactAndroidHeader)
}
