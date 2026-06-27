import type { KindleReadScriptureChapterNav } from '@/lib/kindleReadScripture'

type KindleReadScriptureChapterNavProps = {
  nav: KindleReadScriptureChapterNav
}

export default function KindleReadScriptureChapterNavLinks({
  nav,
}: KindleReadScriptureChapterNavProps) {
  if (!nav.prev && !nav.next) return null

  return (
    <div
      className="kindle-read-scripture-chapter-nav"
      role="navigation"
      aria-label="Passage navigation"
    >
      <div className="kindle-read-scripture-chapter-nav-start">
        {nav.prev ? (
          <a className="kindle-read-action-button" href={nav.prev.href}>
            {nav.prev.label}
          </a>
        ) : null}
      </div>
      <div className="kindle-read-scripture-chapter-nav-end">
        {nav.next ? (
          <a className="kindle-read-action-button" href={nav.next.href}>
            {nav.next.label}
          </a>
        ) : null}
      </div>
    </div>
  )
}
