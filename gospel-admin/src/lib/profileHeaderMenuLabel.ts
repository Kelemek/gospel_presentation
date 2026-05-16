/** Minimum viewport width (px) for showing the word "Menu" beside the hamburger on profile pages. */
export const PROFILE_MENU_LABEL_MIN_VIEWPORT_PX = 390

export function showProfileMenuLabelForViewport(viewportInnerWidth: number): boolean {
  return viewportInnerWidth >= PROFILE_MENU_LABEL_MIN_VIEWPORT_PX
}
