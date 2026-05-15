/**
 * Create a new profile from a dashboard/content JSON backup file.
 * Used by the admin settings page (and previously the dashboard).
 */
export type RestoreNewProfileFromBackupResult = {
  newSlug: string
  originalTitle: string
  message: string
}

export async function restoreNewProfileFromBackupFile(
  file: File
): Promise<RestoreNewProfileFromBackupResult> {
  const fileContent = await file.text()
  const backupData = JSON.parse(fileContent)

  let profileData: {
    title?: string
    slug?: string
    description?: string
    gospelData?: unknown
    lastViewedScripture?: unknown
  }

  if (backupData.profile) {
    profileData = backupData.profile
  } else if (backupData.profileInfo && backupData.gospelData) {
    profileData = {
      ...backupData.profileInfo,
      gospelData: backupData.gospelData,
    }
  } else {
    throw new Error('Invalid backup file format')
  }

  if (!profileData.gospelData || !Array.isArray(profileData.gospelData)) {
    throw new Error('Invalid backup file format: gospelData must be an array')
  }

  let slugToUse = profileData.slug

  if (slugToUse) {
    const slugCheck = await fetch(`/api/profiles/${encodeURIComponent(slugToUse)}`)
    if (slugCheck.ok) {
      slugToUse = undefined
    }
  }

  const restoredTitle = `${profileData.title || 'Profile'} Restored`

  const response = await fetch('/api/profiles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      slug: slugToUse,
      title: restoredTitle,
      description: profileData.description,
      cloneFromSlug: 'default',
      gospelData: profileData.gospelData,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error((errorData as { error?: string }).error || 'Failed to create profile from backup')
  }

  const data = await response.json()
  const newProfile = data.profile || data
  const newSlug = newProfile.slug as string

  const updateResponse = await fetch(`/api/profiles/${newSlug}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gospelData: profileData.gospelData,
      lastViewedScripture: profileData.lastViewedScripture,
    }),
  })

  if (!updateResponse.ok) {
    throw new Error('Profile created but failed to restore full data')
  }

  const usedOriginalSlug = slugToUse === newSlug
  const originalTitle = profileData.title || 'Profile'
  const message = usedOriginalSlug
    ? `Successfully created profile "${originalTitle}" from backup!\n\nSlug: ${newSlug} (original slug restored)`
    : `Successfully created profile "${originalTitle}" from backup!\n\nOriginal slug was taken, new slug: ${newSlug}`

  return { newSlug, originalTitle, message }
}
