/**
 * Plain text for profile body read-aloud (Web Speech). Drops inline scripture / COMA /
 * Four Rules mounts (same exclusion idea as highlight offset streams) and removes buttons
 * so verse-pin controls are not spoken.
 */
export function plainTextForProfileResourceListen(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-gospel-mount]').forEach((el) => el.remove())
  clone.querySelectorAll('button').forEach((el) => el.remove())
  const raw = clone.innerText ?? clone.textContent ?? ''
  return raw.replace(/\s+/g, ' ').trim()
}
