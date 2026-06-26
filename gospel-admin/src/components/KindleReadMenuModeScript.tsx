import { kindleReadMenuModeScriptContent } from '@/lib/kindleReadMenuModeScript'

/** Hides the article and uses page scroll for the menu on Silk (before React hydrates). */
export default function KindleReadMenuModeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: kindleReadMenuModeScriptContent(),
      }}
    />
  )
}
