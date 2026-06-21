import { createDeviceSyncAdminClient } from '@/lib/gospelDeviceSync/deviceSyncSupabase'
import { logger } from '@/lib/logger'

const CLAIM_WINDOW_MS = 60_000
const MAX_CLAIM_ATTEMPTS_PER_WINDOW = 10

export async function checkPairingClaimRateLimit(ip: string): Promise<boolean> {
  try {
    const admin = createDeviceSyncAdminClient()
    const { data, error } = await admin.rpc('check_pairing_claim_rate_limit', {
      p_client_ip: ip,
      p_max_attempts: MAX_CLAIM_ATTEMPTS_PER_WINDOW,
      p_window_seconds: Math.floor(CLAIM_WINDOW_MS / 1000),
    })
    if (error) {
      logger.error('[sync/pairing/claim] rate limit RPC failed:', error)
      return true
    }
    return data === true
  } catch (e) {
    logger.error('[sync/pairing/claim] rate limit check failed:', e)
    return true
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
