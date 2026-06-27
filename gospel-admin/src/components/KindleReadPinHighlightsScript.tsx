import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadPinHighlightsScriptContent } from '@/lib/kindleReadPinHighlightsScript'

/** Runs before React on profile Kindle read pages so last-read and blue pin tints apply on Silk. */
export default function KindleReadPinHighlightsScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-pin-highlights"
      scriptContent={kindleReadPinHighlightsScriptContent()}
    />
  )
}
