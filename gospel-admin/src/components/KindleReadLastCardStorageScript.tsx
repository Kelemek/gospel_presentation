import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadLastCardStorageScriptContent } from '@/lib/kindleReadLastCardStorage'

/** Runs before React on Kindle scripture pages so card progress saves to localStorage. */
export default function KindleReadLastCardStorageScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-last-card-storage"
      scriptContent={kindleReadLastCardStorageScriptContent()}
    />
  )
}
