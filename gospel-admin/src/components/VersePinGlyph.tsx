'use client'

import type { VersePinColorId } from '@/lib/versePinStorage'

/** Pushpin 📌 renders red by default — tint head via CSS filter per slot (brightness kept up so colors stay distinct). */
const VERSE_PUSHPIN_FILTERS: Record<VersePinColorId, string> = {
  red: 'brightness(1.05)',
  blue: 'hue-rotate(195deg) saturate(1.5) brightness(1.35)',
  yellow: 'hue-rotate(48deg) saturate(1.35) brightness(1.38)',
  green: 'hue-rotate(102deg) saturate(1.4) brightness(1.3)',
  violet: 'hue-rotate(278deg) saturate(1.35) brightness(1.28)',
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
