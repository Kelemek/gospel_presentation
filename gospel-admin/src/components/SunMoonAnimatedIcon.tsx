'use client'

import { useId } from 'react'

type SunMoonAnimatedIconProps = {
  className?: string
}

/** Circle bottom sits on this line when the sun is “up” (matches original 12+4). */
const CX = 12
const HORIZON_Y = 16
const SKY_CLIP_HEIGHT = HORIZON_Y

/** Original TableOfContents sun (Heroicons outline). */
const ORIGINAL_SUN_PATH =
  'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'

/** Tapered reflection lines under the horizon (longest first). */
const WATER_LINES: { y: number; x1: number; x2: number }[] = [
  { y: 17.8, x1: 6.5, x2: 17.5 },
  { y: 19.2, x1: 8, x2: 16 },
  { y: 20.5, x1: 9.5, x2: 14.5 },
  { y: 21.6, x1: 10.8, x2: 13.2 },
]

/**
 * Looped horizon scene: rise 5s → hold 5s → set 5s (15s total).
 */
export default function SunMoonAnimatedIcon({ className = 'w-6 h-6 shrink-0' }: SunMoonAnimatedIconProps) {
  const clipId = useId().replace(/:/g, '')

  return (
    <span className={`sun-moon-animated-icon relative inline-block ${className}`} aria-hidden>
      <svg
        className="sun-moon-animated-icon__stage absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="24" height={SKY_CLIP_HEIGHT} />
          </clipPath>
        </defs>

        <g
          className="sun-moon-animated-icon__water"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        >
          {WATER_LINES.map(({ y, x1, x2 }) => (
            <g
              key={y}
              className="sun-moon-animated-icon__water-line"
              style={{ transformOrigin: `${CX}px ${y}px` }}
            >
              <line x1={x1} y1={y} x2={x2} y2={y} />
            </g>
          ))}
        </g>

        <line
          className="sun-moon-animated-icon__horizon"
          x1={3}
          y1={HORIZON_Y}
          x2={21}
          y2={HORIZON_Y}
          strokeLinecap="round"
          strokeWidth={2}
          stroke="currentColor"
        />

        <g clipPath={`url(#${clipId})`}>
          <path
            className="sun-moon-animated-icon__sun"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={ORIGINAL_SUN_PATH}
            style={{ transformOrigin: `${CX}px ${HORIZON_Y}px` }}
          />
        </g>
      </svg>
    </span>
  )
}
