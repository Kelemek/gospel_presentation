'use client'

import type { VersePinColorId } from '@/lib/versePinStorage'

/** Pushpin 📌 renders red by default on most platforms — tint head via CSS filter per slot. */
const VERSE_PUSHPIN_FILTERS: Record<VersePinColorId, string> = {
  red: 'none',
  blue: 'hue-rotate(198deg) saturate(1.2)',
  yellow: 'hue-rotate(48deg) saturate(1.35) brightness(1.05)',
  green: 'hue-rotate(95deg) saturate(1.15)',
  violet: 'hue-rotate(270deg) saturate(1.1)',
}

export function versePinEmojiFilterCss(colorId: VersePinColorId): string {
  return VERSE_PUSHPIN_FILTERS[colorId]
}

export default function VersePinGlyph({
  colorId,
  title,
}: {
  colorId: VersePinColorId
  /** Optional tooltip on the emoji control */
  title?: string
}) {
  const filter = VERSE_PUSHPIN_FILTERS[colorId]
  return (
    <span className="inline-block select-none leading-none" style={{ filter }} title={title}>
      📌
    </span>
  )
}
