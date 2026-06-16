import type { VerseBookmarkColorId } from '@/lib/versePinStorage'

/** Bible Reader highlight tints (includes yellow; pin bookmarks omit yellow). */
export const SCRIPTURE_HIGHLIGHT_COLOR_IDS = [
  'red',
  'blue',
  'yellow',
  'green',
  'violet',
] as const
export type ScriptureHighlightColorId = (typeof SCRIPTURE_HIGHLIGHT_COLOR_IDS)[number]

/** Tailwind classes for scripture modal `<mark>` highlights (per tint). */
export const SCRIPTURE_HIGHLIGHT_MARK_CLASSES: Record<ScriptureHighlightColorId, string> = {
  red: 'scripture-highlight-mark scripture-highlight-mark-red',
  blue: 'scripture-highlight-mark scripture-highlight-mark-blue',
  yellow: 'scripture-highlight-mark scripture-highlight-mark-yellow',
  green: 'scripture-highlight-mark scripture-highlight-mark-green',
  violet: 'scripture-highlight-mark scripture-highlight-mark-violet',
}

/** SVG stroke/fill colors for marker icon tint (matches pin palette). */
export const SCRIPTURE_HIGHLIGHT_MARKER_ICON_COLORS: Record<
  ScriptureHighlightColorId,
  string
> = {
  red: '#b91c1c',
  blue: '#1d4ed8',
  yellow: '#ca8a04',
  green: '#047857',
  violet: '#6d28d9',
}

/** Marker tint when no highlight color is active (subset of bookmark colors still valid). */
export function scriptureHighlightMarkerIconColor(
  colorId: ScriptureHighlightColorId | VerseBookmarkColorId | null
): string {
  if (colorId == null) return SCRIPTURE_HIGHLIGHT_MARKER_ICON_NEUTRAL
  return SCRIPTURE_HIGHLIGHT_MARKER_ICON_COLORS[colorId as ScriptureHighlightColorId]
}

export const SCRIPTURE_HIGHLIGHT_MARKER_ICON_NEUTRAL = '#64748b'
