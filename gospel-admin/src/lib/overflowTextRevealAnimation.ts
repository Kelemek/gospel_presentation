export function measureOverflowRevealPx(container: HTMLElement, text: HTMLElement): number {
  return Math.max(0, text.scrollWidth - container.clientWidth)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export function setOverflowRevealTranslate(text: HTMLElement, px: number): void {
  if (px <= 0) {
    text.style.transform = ''
    return
  }
  text.style.transform = `translateX(${-px}px)`
}

export function animateOverflowRevealTranslate(
  text: HTMLElement,
  fromPx: number,
  toPx: number,
  durationMs: number,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    setOverflowRevealTranslate(text, toPx)
    return Promise.resolve()
  }
  if (durationMs <= 0 || fromPx === toPx) {
    setOverflowRevealTranslate(text, toPx)
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const start = performance.now()

    const tick = (now: number) => {
      if (signal.aborted) {
        setOverflowRevealTranslate(text, toPx)
        resolve()
        return
      }
      const t = Math.min(1, (now - start) / durationMs)
      const current = fromPx + (toPx - fromPx) * easeInOutCubic(t)
      setOverflowRevealTranslate(text, current)
      if (t < 1) {
        requestAnimationFrame(tick)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(tick)
  })
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const id = window.setTimeout(() => resolve(), ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id)
        resolve()
      },
      { once: true }
    )
  })
}

export type OverflowTextRevealOptions = {
  pauseStartMs?: number
  pauseEndMs?: number
  scrollMsPerPx?: number
  minScrollMs?: number
  maxScrollMs?: number
  returnScrollMs?: number
}

/** Pan clipped overflow text so the full string is readable, then return to the start. */
export async function playOverflowTextReveal(
  container: HTMLElement,
  text: HTMLElement,
  signal: AbortSignal,
  options: OverflowTextRevealOptions = {}
): Promise<void> {
  setOverflowRevealTranslate(text, 0)
  const overflow = measureOverflowRevealPx(container, text)
  if (overflow <= 0) return

  const pauseStartMs = options.pauseStartMs ?? 600
  const pauseEndMs = options.pauseEndMs ?? 900
  const scrollMsPerPx = options.scrollMsPerPx ?? 12
  const minScrollMs = options.minScrollMs ?? 800
  const maxScrollMs = options.maxScrollMs ?? 2800
  const returnScrollMs = options.returnScrollMs ?? 1500

  const scrollMs = Math.min(maxScrollMs, Math.max(minScrollMs, overflow * scrollMsPerPx))

  await sleep(pauseStartMs, signal)
  if (signal.aborted) return

  await animateOverflowRevealTranslate(text, 0, overflow, scrollMs, signal)
  if (signal.aborted) return

  await sleep(pauseEndMs, signal)
  if (signal.aborted) return

  await animateOverflowRevealTranslate(
    text,
    overflow,
    0,
    Math.min(returnScrollMs, scrollMs * 0.65),
    signal
  )
}
