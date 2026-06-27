import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadTextSizeStorageScriptContent } from '@/lib/kindleReadTextSizePreference'

/** Runs before React on Kindle read pages so text size applies without waiting for hydration. */
export default function KindleReadTextSizeStorageScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-text-size-storage"
      scriptContent={kindleReadTextSizeStorageScriptContent()}
    />
  )
}
