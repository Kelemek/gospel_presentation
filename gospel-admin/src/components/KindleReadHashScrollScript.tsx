import KindleReadInlineScript from '@/components/KindleReadInlineScript'
import { kindleReadHashScrollScriptContent } from '@/lib/kindleReadHashScrollScript'

/** Corrects in-page hash scroll for the sticky Kindle read toolbar (Silk + search/TOC links). */
export default function KindleReadHashScrollScript() {
  return (
    <KindleReadInlineScript
      scriptId="kindle-read-hash-scroll"
      scriptContent={kindleReadHashScrollScriptContent()}
    />
  )
}
