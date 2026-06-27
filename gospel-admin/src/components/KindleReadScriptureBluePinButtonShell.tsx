import { versePinEntryFromKindleScriptureParams } from '@/lib/kindleReadVersePinProgress'

type KindleReadScriptureBluePinButtonShellProps = {
  from: string | null | undefined
  reference: string | null | undefined
  anchor: string | null | undefined
}

/** Server-rendered Add Pin control; wired by KindleReadBluePinButtonScript after page content. */
export default function KindleReadScriptureBluePinButtonShell({
  from,
  reference,
  anchor,
}: KindleReadScriptureBluePinButtonShellProps) {
  const fromSlug = from?.trim()
  const anchorTrim = anchor?.trim()
  const entry = versePinEntryFromKindleScriptureParams(fromSlug, reference, anchor)
  if (!entry || !fromSlug || !anchorTrim) return null

  const payload = JSON.stringify({
    from: fromSlug,
    reference: entry.reference,
    sectionId: entry.sectionId,
    subsectionId: entry.subsectionId,
    kindleAnchor: anchorTrim,
  })

  return (
    <button
      type="button"
      className="kindle-read-action-button kindle-read-pin-button kindle-read-blue-pin-toggle"
      data-kindle-blue-pin={payload}
      aria-pressed="false"
      suppressHydrationWarning
    >
      Add Pin
    </button>
  )
}
