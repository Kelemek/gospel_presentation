// Shared helpers for admin profile creation (used by dashboard + tests).

export function generateSlug(title: string) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 15) || 'profile'
}

export function createProfilePayload(form: {
  title: string
  description?: string
  cloneFromSlug?: string
  isTemplate?: boolean
  slug?: string
  /** When true, server stores empty gospel sections (no clone). */
  blankGospelData?: boolean
}) {
  const slug = (form.slug || '').trim().toLowerCase()
  const base = {
    ...(slug ? { slug } : {}),
    title: (form.title || '').trim(),
    description: (form.description || '').trim() || undefined,
    isTemplate: !!form.isTemplate,
  }
  if (form.blankGospelData) {
    return { ...base, blankGospelData: true as const }
  }
  return {
    ...base,
    cloneFromSlug: form.cloneFromSlug || 'default',
  }
}

export function isUniqueConstraintError(errOrMessage: unknown) {
  const text =
    typeof errOrMessage === 'string'
      ? errOrMessage
      : errOrMessage && typeof errOrMessage === 'object' && errOrMessage !== null
        ? String(
            ('error' in errOrMessage
              ? (errOrMessage as { error?: string }).error
              : undefined) ||
              ('message' in errOrMessage ? (errOrMessage as { message?: string }).message : undefined) ||
              ''
          )
        : ''

  return (
    typeof text === 'string' &&
    (text.includes('duplicate key') ||
      text.includes('unique constraint') ||
      text.includes('profiles_slug_key'))
  )
}

/** App-level duplicate check in createProfile or Postgres unique violation on slug. */
export function isProfileSlugTakenError(errOrMessage: unknown): boolean {
  if (isUniqueConstraintError(errOrMessage)) return true
  const text =
    typeof errOrMessage === 'string'
      ? errOrMessage
      : errOrMessage && typeof errOrMessage === 'object' && errOrMessage !== null
        ? String(
            ('error' in errOrMessage
              ? (errOrMessage as { error?: string }).error
              : undefined) ||
              ('message' in errOrMessage ? (errOrMessage as { message?: string }).message : undefined) ||
              ''
          )
        : ''
  return typeof text === 'string' && text.includes('Profile with slug') && text.includes('already exists')
}
