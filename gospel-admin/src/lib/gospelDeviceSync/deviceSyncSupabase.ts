import { createAdminClient } from '@/lib/supabase/server'

type DeviceSyncTable = 'pairing_sessions' | 'sync_key_entries'

type PairingClaimRateLimitArgs = {
  p_client_ip: string
  p_max_attempts: number
  p_window_seconds: number
}

/** Admin client for device-sync tables (not yet in generated `database.types`). */
export function createDeviceSyncAdminClient() {
  return createAdminClient() as unknown as {
    from(table: DeviceSyncTable): ReturnType<ReturnType<typeof createAdminClient>['from']>
    rpc(
      fn: 'check_pairing_claim_rate_limit',
      args: PairingClaimRateLimitArgs
    ): Promise<{ data: boolean | null; error: { message: string } | null }>
  }
}
