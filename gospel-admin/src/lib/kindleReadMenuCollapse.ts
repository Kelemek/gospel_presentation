/** Close the Menu root and every nested open <details> inside it. */
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

/** Anchor clicked inside `.kindle-read-menu`, or null when the click should not collapse. */
export function kindleReadMenuLinkFromClickTarget(
  target: EventTarget | null
): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null
  const link = target.closest('.kindle-read-menu a[href]')
  if (!(link instanceof HTMLAnchorElement)) return null
  const href = link.getAttribute('href')
  if (!href || href === '#') return null
  return link
}
