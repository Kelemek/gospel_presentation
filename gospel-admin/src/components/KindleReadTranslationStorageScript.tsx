import { kindleReadTranslationStorageScriptContent } from '@/lib/kindleReadTranslationPreference'

/** Runs before React on Kindle read pages so translation links update localStorage. */
export default function KindleReadTranslationStorageScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: kindleReadTranslationStorageScriptContent(),
      }}
    />
  )
}
