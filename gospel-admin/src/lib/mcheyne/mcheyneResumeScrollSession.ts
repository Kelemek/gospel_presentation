export type McheyneResumeScrollCancel = () => void

/** Cancel the active resume-pin scroll RAF loop, if any. */
export function cancelMcheyneResumeScroll(
  activeCancelRef: { current: McheyneResumeScrollCancel | null }
): void {
  activeCancelRef.current?.()
  activeCancelRef.current = null
}

/** Replace any in-flight resume scroll with a new cancel token. */
export function startMcheyneResumeScroll(
  activeCancelRef: { current: McheyneResumeScrollCancel | null },
  cancelScroll: McheyneResumeScrollCancel
): void {
  cancelMcheyneResumeScroll(activeCancelRef)
  activeCancelRef.current = cancelScroll
}

/** Clear the active token when scroll completes or is given up. */
export function finishMcheyneResumeScrollSession(
  activeCancelRef: { current: McheyneResumeScrollCancel | null }
): void {
  activeCancelRef.current = null
}
