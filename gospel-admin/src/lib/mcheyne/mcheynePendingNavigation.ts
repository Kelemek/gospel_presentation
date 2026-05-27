/** One-shot scroll intent when opening `/mchy` from the Resources calendar modal. */
const PENDING_PLAN_DAY_KEY = 'gospel-mcheyne-pending-plan-day:v1'
const PENDING_RESUME_PIN_KEY = 'gospel-mcheyne-pending-resume-pin:v1'

export function setPendingMcheynePlanDay(planDay: number): void {
  if (typeof window === 'undefined' || !Number.isFinite(planDay) || planDay < 1) return
  sessionStorage.setItem(PENDING_PLAN_DAY_KEY, String(Math.floor(planDay)))
}

export function consumePendingMcheynePlanDay(): number | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PENDING_PLAN_DAY_KEY)
  sessionStorage.removeItem(PENDING_PLAN_DAY_KEY)
  if (!raw) return null
  const planDay = parseInt(raw, 10)
  return Number.isFinite(planDay) && planDay >= 1 ? planDay : null
}

function parseValidMcheynePlanDayParam(raw: string): number | null {
  const parsed = parseInt(raw.trim(), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

/**
 * Plan day from `?planDay=` when valid (clears duplicate pending), else from pending when
 * the param is absent. Invalid URL values do not consume pending.
 */
export function resolveMcheynePlanDayFromNavigation(urlPlanDayParam: string): number | null {
  const trimmed = urlPlanDayParam.trim()
  if (!trimmed) return consumePendingMcheynePlanDay()

  const fromUrl = parseValidMcheynePlanDayParam(trimmed)
  if (fromUrl != null) {
    consumePendingMcheynePlanDay()
    return fromUrl
  }
  return null
}

export function setPendingMcheyneResumePin(): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_RESUME_PIN_KEY, '1')
}

export function consumePendingMcheyneResumePin(): boolean {
  if (typeof window === 'undefined') return false
  const had = sessionStorage.getItem(PENDING_RESUME_PIN_KEY) === '1'
  sessionStorage.removeItem(PENDING_RESUME_PIN_KEY)
  return had
}

/**
 * Resume intent from `?resumePin=1` when valid (clears duplicate pending), else from pending
 * when the param is absent. Other URL values do not consume pending.
 */
export function resolveMcheyneResumePinFromNavigation(urlResumePinParam: string): boolean {
  const trimmed = urlResumePinParam.trim()
  if (!trimmed) return consumePendingMcheyneResumePin()

  if (trimmed === '1') {
    consumePendingMcheyneResumePin()
    return true
  }
  return false
}
