'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { injectGospelInlineMarkersInHtml } from '@/lib/injectGospelInlineMarkersInHtml'
import type { VersePinAnchoredEntry } from '@/lib/versePinStorage'
import { anchoredPinMatchesDisplayRow } from '@/lib/versePinStorage'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'
import VersePinGlyph from '@/components/VersePinGlyph'
import { PILL_LINK_CLASS, PILL_STYLE, VERSE_PIN_PILL_STYLES } from '@/components/gospelInlinePillStyles'

type ScriptureClickHandler = (
  reference: string,
  anchorSectionId?: string,
  anchorSubsectionId?: string
) => void

type VersePinRemoveHandler = (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => void

function versePinForRow(
  versePins: VersePinAnchoredEntry[] | undefined,
  reference: string,
  anchorSectionId: string | undefined,
  anchorSubsectionId: string | undefined
): VersePinAnchoredEntry | null {
  if (!versePins?.length || !anchorSectionId || !anchorSubsectionId) return null
  return (
    versePins.find((pin) =>
      anchoredPinMatchesDisplayRow(pin, reference, anchorSectionId, anchorSubsectionId)
    ) ?? null
  )
}

export type GospelInlineHtmlProps = {
  html: string
  onComaClick: () => void
  onScriptureClick?: ScriptureClickHandler
  onFourRulesClick?: () => void
  anchorSectionId?: string
  anchorSubsectionId?: string
  versePins?: VersePinAnchoredEntry[]
  onRemoveVersePin?: VersePinRemoveHandler
}

type PortalTarget =
  | { key: string; kind: 'coma'; el: Element; label: string }
  | { key: string; kind: 'fourRules'; el: Element }
  | { key: string; kind: 'scripture'; el: Element; reference: string }

/**
 * Renders stored rich HTML, then portals COMA / Four Rules / scripture UI into mount spans.
 * Uses createPortal (not createRoot) so ScriptureHoverModal stays under TranslationProvider.
 * Injects via `el.innerHTML` in layout (not `dangerouslySetInnerHTML` on every render) so React
 * does not replace mount nodes and destroy portal targets on re-render.
 */
export default function GospelInlineHtml({
  html,
  onComaClick,
  onScriptureClick,
  onFourRulesClick,
  anchorSectionId,
  anchorSubsectionId,
  versePins,
  onRemoveVersePin,
}: GospelInlineHtmlProps) {
  const safeHtml = html ?? ''
  const [portals, setPortals] = useState<PortalTarget[]>([])
  const containerRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return
    const el = containerRef.current
    if (!el) return
    el.innerHTML = injectGospelInlineMarkersInHtml(safeHtml)

    const next: PortalTarget[] = []
    let idx = 0
    el.querySelectorAll('[data-gospel-mount="coma"]').forEach((node) => {
      next.push({
        key: `coma-${idx++}`,
        kind: 'coma',
        el: node,
        label: node.getAttribute('data-gospel-coma-label') ?? 'COMA',
      })
    })
    el.querySelectorAll('[data-gospel-mount="fourRules"]').forEach((node) => {
      next.push({ key: `four-${idx++}`, kind: 'fourRules', el: node })
    })
    el.querySelectorAll('[data-gospel-mount="scripture"]').forEach((node) => {
      const reference = node.getAttribute('data-gospel-ref')
      if (!reference) return
      next.push({ key: `scr-${idx++}-${reference}`, kind: 'scripture', el: node, reference })
    })
    setPortals(next)
  }, [safeHtml])

  const portalNodes: ReactNode[] = portals.map((t) => {
    if (t.kind === 'coma') {
      return createPortal(
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onComaClick()
          }}
          className={PILL_LINK_CLASS}
          style={PILL_STYLE}
          title="Learn about the C.O.M.A. method"
        >
          {t.label}
        </a>,
        t.el,
        t.key
      )
    }
    if (t.kind === 'fourRules') {
      return createPortal(
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFourRulesClick?.()
          }}
          className={PILL_LINK_CLASS}
          style={PILL_STYLE}
          title="View the Four Rules of Communication"
        >
          Four Rules of Communication
        </a>,
        t.el,
        t.key
      )
    }

    const reference = t.reference
    const rowPin =
      anchorSectionId != null && anchorSubsectionId != null
        ? versePinForRow(versePins, reference, anchorSectionId, anchorSubsectionId)
        : null

    if (onScriptureClick) {
      return createPortal(
        <ScriptureHoverModal reference={reference} hoverDelayMs={500} inline>
          <span className="relative inline-flex items-center" style={{ margin: '0 2px', verticalAlign: 'baseline' }}>
            <button
              type="button"
              className={rowPin ? VERSE_PIN_PILL_STYLES[rowPin.colorId].pill : PILL_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation()
                onScriptureClick(reference, anchorSectionId, anchorSubsectionId)
              }}
              style={{ fontSize: 'inherit' }}
              title={`Click to view ${reference}`}
            >
              {reference}
            </button>
            {rowPin && onRemoveVersePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveVersePin({ colorId: rowPin.colorId, bookmarkId: rowPin.bookmarkId })
                }}
                className={`absolute right-0 top-1/2 -translate-y-1/2 transition-colors cursor-pointer p-0.5 ${VERSE_PIN_PILL_STYLES[rowPin.colorId].unpinWrap}`}
                title="Remove pin for this passage"
                aria-label={`Remove ${rowPin.colorId} pin for ${reference}`}
              >
                <VersePinGlyph colorId={rowPin.colorId} />
              </button>
            )}
          </span>
        </ScriptureHoverModal>,
        t.el,
        t.key
      )
    }

    return createPortal(
      <span
        className="px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded whitespace-nowrap"
        style={PILL_STYLE}
      >
        {reference}
      </span>,
      t.el,
      t.key
    )
  })

  return (
    <span className="contents">
      <span ref={containerRef} suppressHydrationWarning />
      {portalNodes}
    </span>
  )
}
