import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadMenuModeScriptContent } from '@/lib/kindleReadMenuModeScript'

/** Hides the article and uses page scroll for the menu on Silk (before React hydrates). */
export default function KindleReadMenuModeScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-menu-mode"
      scriptContent={kindleReadMenuModeScriptContent()}
    />
  )
}
