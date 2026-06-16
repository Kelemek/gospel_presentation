import type { ScriptureHighlightColorId } from '@/lib/scriptureHighlightStyles'
import { scriptureHighlightMarkerIconColor } from '@/lib/scriptureHighlightStyles'

const MARKER_TIP_D = 'm9 11-6 6v3h9l3-3'
const PEN_D = 'm22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'

const OUTLINE_STROKE_WIDTH = 2
/** Rotated block behind the pen outline (center ≈ barrel midpoint, −45°). */
const BARREL_FILL_CENTER = { x: 18, y: 8.5 }
const BARREL_FILL_WIDTH = 11.4
const BARREL_FILL_HEIGHT = 5.4

const roundStroke = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export interface HighlightMarkerIconProps {
  className?: string
  /** Tint when a highlight color is active (outline stroke or filled body). */
  markerColorId?: ScriptureHighlightColorId | null
  /** `outline` for toolbar triggers; `filled` for color swatches in the picker menu. */
  variant?: 'outline' | 'filled'
}

function MarkerOutlinePaths({
  neutral,
  markerFill,
  stroke = 'css',
}: {
  neutral: boolean
  markerFill: string
  /** `css` = slate/white via globals; `color` = marker tint; `currentColor` = inherit from svg. */
  stroke?: 'css' | 'color' | 'currentColor'
}) {
  const strokeValue =
    stroke === 'currentColor' ? 'currentColor' : stroke === 'color' && !neutral ? markerFill : undefined

  return (
    <>
      <path
        d={MARKER_TIP_D}
        fill="none"
        stroke={strokeValue}
        strokeWidth={OUTLINE_STROKE_WIDTH}
        className={stroke === 'css' && neutral ? 'highlight-marker-icon-neutral-outline' : undefined}
        {...roundStroke}
      />
      <path
        d={PEN_D}
        fill="none"
        stroke={strokeValue}
        strokeWidth={OUTLINE_STROKE_WIDTH}
        className={stroke === 'css' && neutral ? 'highlight-marker-icon-pen' : undefined}
        {...roundStroke}
      />
    </>
  )
}

export default function HighlightMarkerIcon({
  className = 'w-5 h-5 shrink-0',
  markerColorId = null,
  variant = 'outline',
}: HighlightMarkerIconProps) {
  const markerFill = scriptureHighlightMarkerIconColor(markerColorId)
  const neutral = markerColorId == null

  if (variant === 'outline') {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden>
        <MarkerOutlinePaths
          neutral={neutral}
          markerFill={markerFill}
          stroke={neutral ? 'css' : 'color'}
        />
      </svg>
    )
  }

  return (
    <svg
      className={`${className} text-slate-800 dark:text-white`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect
        x={BARREL_FILL_CENTER.x - BARREL_FILL_WIDTH / 2}
        y={BARREL_FILL_CENTER.y - BARREL_FILL_HEIGHT / 2}
        width={BARREL_FILL_WIDTH}
        height={BARREL_FILL_HEIGHT}
        fill={markerFill}
        transform={`rotate(-45 ${BARREL_FILL_CENTER.x} ${BARREL_FILL_CENTER.y})`}
      />
      <path d={MARKER_TIP_D} fill={markerFill} stroke="none" />
      <MarkerOutlinePaths neutral={false} markerFill={markerFill} stroke="currentColor" />
    </svg>
  )
}
