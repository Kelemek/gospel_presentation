import Link from 'next/link'
import { ScriptureFooterAttributionParagraphs } from '@/components/ScriptureFooterAttributionParagraphs'

type KindleReadFooterProps = {
  enabledTranslationCodes: readonly string[]
  fullSiteUrl?: string
  refreshHref?: string
}

/** Scripture attribution and read-mode footer — matches main profile footer content. */
export default function KindleReadFooter({
  enabledTranslationCodes,
  fullSiteUrl,
  refreshHref,
}: KindleReadFooterProps) {
  return (
    <footer className="kindle-read-footer">
      <div className="kindle-read-attribution">
        <ScriptureFooterAttributionParagraphs
          enabledTranslationCodes={enabledTranslationCodes}
          anchorClassName=""
        />
      </div>
      <p className="kindle-read-footer-other-content">
        Credits for imported books, sermon libraries, the M&apos;Cheyne reading plan, ACBC resource links,
        and other content are listed on the{' '}
        <Link href="/copyright/">full Copyright &amp; Attribution page</Link> on a phone, tablet, or
        computer.
      </p>
      {fullSiteUrl ? (
        <p>
          Read-only view for e-readers. For scripture modals, bookmarks, and sync, use the{' '}
          <a href={fullSiteUrl}>full site</a> on a phone, tablet, or computer.
        </p>
      ) : null}
      {refreshHref ? (
        <p>
          <a href={refreshHref}>Refresh this page</a>
        </p>
      ) : null}
    </footer>
  )
}
