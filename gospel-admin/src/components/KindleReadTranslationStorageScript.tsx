import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadTranslationStorageScriptContent } from '@/lib/kindleReadTranslationPreference'

/** Runs before React on Kindle read pages so translation links update localStorage. */
export default function KindleReadTranslationStorageScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-translation-storage"
      scriptContent={kindleReadTranslationStorageScriptContent()}
    />
  )
}
