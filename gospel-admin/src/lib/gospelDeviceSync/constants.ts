export const GOSPEL_SYNC_ENABLED_KEY = 'gospel-sync-enabled:v1' as const
export const GOSPEL_SYNC_KEY_KEY = 'gospel-sync-key:v1' as const
export const GOSPEL_SYNC_KEY_VERSIONS_KEY = 'gospel-sync-key-versions:v1' as const
export const GOSPEL_SYNC_DIRTY_KEYS_KEY = 'gospel-sync-dirty-keys:v1' as const

export const GOSPEL_SYNC_KEY_PREFIX = 'gospel-sync-' as const

export const SYNC_STORAGE_ID_HEADER = 'X-Sync-Storage-Id' as const

/** Pairing code lifetime (milliseconds). */
export const PAIRING_CODE_TTL_MS = 120_000

/** Poll interval while waiting for another device to claim a pairing code. */
export const PAIRING_CODE_CLAIM_POLL_MS = 2_000

/** Debounced push delay after local writes (bursts collapse; background flush covers short sessions). */
export const SYNC_PUSH_DEBOUNCE_MS = 5_000

/** Minimum interval between manifest pulls while app is open. */
export const SYNC_PULL_INTERVAL_MS = 60_000

/** Profile pages dispatch after persisting reading resume so upload includes scroll position. */
export const GOSPEL_SYNC_FLUSH_REQUEST_EVENT = 'gospel-sync-flush-request' as const

/** Fired once after the first startup manifest pull attempt (even when nothing changed). */
export const GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT = 'gospel-sync-startup-pull-done' as const

/** Max plaintext bytes per synced storage key. */
export const SYNC_MAX_VALUE_BYTES = 500_000

/** Max storage keys per sync group. */
export const SYNC_MAX_KEYS_PER_GROUP = 500

export const PAIRING_WRAP_SALT = 'gospel-device-sync-pair-v1' as const
export const SYNC_VALUE_INFO = 'gospel-sync-value-v1' as const
