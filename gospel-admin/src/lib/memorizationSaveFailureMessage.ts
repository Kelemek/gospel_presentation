import { Capacitor } from '@capacitor/core'
import type { AddMemorizedVerseFailureReason } from '@/lib/verseMemorizationStorage'

/** User-facing alert text for a failed memorization save. */
export function memorizationSaveFailureMessage(reason: AddMemorizedVerseFailureReason): string {
  const isNativeApp =
    typeof window !== 'undefined' && Capacitor.isNativePlatform()

  switch (reason) {
    case 'empty_reference':
      return 'No Bible reference was provided for this verse.'
    case 'empty_text':
      return 'No verse text was available to save. Wait until the passage finishes loading, then try again.'
    case 'duplicate':
      return 'This verse is already in your memorization list.'
    case 'storage_unavailable':
      if (isNativeApp) {
        return (
          'The Gospel Presentation app could not save this verse. Force-quit the app and open it again. ' +
          'If it still fails, delete and reinstall the app (use Menu → Save my data first to back up).'
        )
      }
      return (
        'This browser is not allowing the app to save data on your device. ' +
        'Turn off Safari Private Browsing (or similar), or allow website data for this site, then try again.'
      )
    case 'storage_full':
      if (isNativeApp) {
        return (
          'Saved data in the app has reached its storage limit (this is separate from free space on your iPhone). ' +
          'Use Menu → Save my data to back up, remove memorized verses you no longer need under Menu → Memorize, then try again.'
        )
      }
      return (
        'Your browser storage for this site is full, so the verse could not be saved. ' +
        'Use Menu → Save my data to back up first, then remove old memorized verses you no longer need, or clear cached presentation data in Safari Settings → Advanced → Website Data for this site.'
      )
    default: {
      const _exhaustive: never = reason
      return _exhaustive
    }
  }
}
