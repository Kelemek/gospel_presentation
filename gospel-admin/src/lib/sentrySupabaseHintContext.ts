import * as Sentry from '@sentry/nextjs'

/** Narrow `hint.originalException` and attach Supabase-shaped fields when present. */
export function attachSupabaseContextFromHint(
  hint: { originalException?: unknown },
  includeMessage: boolean
): void {
  const raw = hint.originalException
  if (raw == null || typeof raw !== 'object') return
  const error = raw as Record<string, unknown>
  const msg = error.message
  const messageStr = typeof msg === 'string' ? msg : ''
  if (!messageStr.includes('supabase') && error.code === undefined) return

  const ctx: Record<string, unknown> = {
    errorCode: error.code,
    details: error.details,
    hint: error.hint,
  }
  if (includeMessage) ctx.message = error.message
  Sentry.setContext('supabase', ctx)
}
