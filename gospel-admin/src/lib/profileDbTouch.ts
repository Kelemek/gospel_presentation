/** ISO timestamp for `profiles.updated_at` so client offline cache invalidates via `/api/profiles/[slug]/modified`. */
export function profileUpdatedAtIso(): string {
  return new Date().toISOString()
}

export function profileDbTouchFields(): { updated_at: string } {
  return { updated_at: profileUpdatedAtIso() }
}
