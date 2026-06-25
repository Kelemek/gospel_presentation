import type { KindleReadScriptureChapterNav } from '@/lib/kindleReadScripture'

type KindleReadScriptureChapterNavProps = {
  nav: KindleReadScriptureChapterNav
}

export default function KindleReadScriptureChapterNavLinks({
  nav,
}: KindleReadScriptureChapterNavProps) {
  if (!nav.prev && !nav.next) return null

  return (
    <p className="kindle-read-scripture-chapter-nav">
      {nav.prev ? <a href={nav.prev.href}>{nav.prev.label}</a> : null}
      {nav.next ? <a href={nav.next.href}>{nav.next.label}</a> : null}
    </p>
  )
}
