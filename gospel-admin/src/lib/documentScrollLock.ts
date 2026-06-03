/**
 * Lock window scroll while overlays are open without jumping the page to the top.
 * Uses position:fixed on body (saved scrollY in `top`) instead of overflow-only locking.
 */

let lockCount = 0
let lockedScrollY = 0

type BodyStyleSnapshot = {
  overflow: string
  position: string
  top: string
  left: string
  right: string
  width: string
  paddingRight: string
}

let bodyStyleSnapshot: BodyStyleSnapshot | null = null
let htmlOverflowSnapshot: string | null = null

function applyLock(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  lockedScrollY = window.scrollY
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  const { body, documentElement } = document

  bodyStyleSnapshot = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  }
  htmlOverflowSnapshot = documentElement.style.overflow

  body.style.overflow = 'hidden'
  documentElement.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${lockedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`
  }
}

function applyUnlock(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!bodyStyleSnapshot || htmlOverflowSnapshot === null) return

  const { body, documentElement } = document
  const y = lockedScrollY
  const snap = bodyStyleSnapshot
  const htmlOverflow = htmlOverflowSnapshot

  body.style.overflow = snap.overflow
  body.style.position = snap.position
  body.style.top = snap.top
  body.style.left = snap.left
  body.style.right = snap.right
  body.style.width = snap.width
  body.style.paddingRight = snap.paddingRight
  documentElement.style.overflow = htmlOverflow

  bodyStyleSnapshot = null
  htmlOverflowSnapshot = null

  window.scrollTo(0, y)
}

/** Returns an unlock function; safe to nest (reference counted). */
export function lockDocumentScroll(): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  lockCount += 1
  if (lockCount === 1) {
    applyLock()
  }

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0) {
      applyUnlock()
    }
  }
}

/** Test-only reset of module state. */
export function resetDocumentScrollLockForTests(): void {
  lockCount = 0
  lockedScrollY = 0
  bodyStyleSnapshot = null
  htmlOverflowSnapshot = null
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.paddingRight = ''
    document.documentElement.style.overflow = ''
  }
}
