import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadBluePinButtonScriptContent } from '@/lib/kindleReadBluePinButtonScript'

/** After page content so the Add Pin button exists when this runs (Kindle Silk). */
export default function KindleReadBluePinButtonScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-blue-pin-button"
      scriptContent={kindleReadBluePinButtonScriptContent()}
    />
  )
}
