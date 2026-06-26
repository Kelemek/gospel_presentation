import { KINDLE_READ_ROOT_MENU_OPEN_CLASS } from '@/lib/kindleReadMenuConstants'

/** Close every open nested <details> inside a menu container. */
export function closeKindleReadMenuDetails(menuRoot: Element): void {
  const openDetails = menuRoot.matches('details[open]')
    ? [menuRoot, ...menuRoot.querySelectorAll('details[open]')]
    : [...menuRoot.querySelectorAll('details[open]')]

  openDetails.forEach((details) => {
    if (details instanceof HTMLDetailsElement) {
      details.open = false
    }
  })
}

/** Close the profile read Menu trigger and nested sections in the scrollable panel. */
export function closeKindleReadProfileMenu(): void {
  const root = document.querySelector('.kindle-read-root')
  root?.classList.remove(KINDLE_READ_ROOT_MENU_OPEN_CLASS)

  const btn = document.querySelector('.kindle-read-menu-trigger-btn')
  btn?.setAttribute('aria-expanded', 'false')

  const panel = document.querySelector('.kindle-read-menu-panel')
  if (panel) {
    closeKindleReadMenuDetails(panel)
  }
}

/** Anchor clicked inside a Kindle read menu panel, or null when the click should not collapse. */
export function kindleReadMenuLinkFromClickTarget(
  target: EventTarget | null
): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null
  const link = target.closest('.kindle-read-menu-panel a[href], .kindle-read-menu a[href]')
  if (!(link instanceof HTMLAnchorElement)) return null
  const href = link.getAttribute('href')
  if (!href || href === '#') return null
  return link
}
