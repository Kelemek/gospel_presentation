type OpenBookIconProps = {
  className?: string
}

/** Heroicons-style pages meeting at the top; no center spine (`M12 … v13`). */
const LEFT_PAGE_PATH =
  'M12 6.253C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253'

const RIGHT_PAGE_PATH =
  'M12 6.253C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'

/** Open book with “365” — matches Resources row icon size (`SunMoonAnimatedIcon`). */
export function OpenBookIcon({ className = 'w-6 h-6 shrink-0' }: OpenBookIconProps) {
  return (
    <span className={`relative inline-block ${className}`} aria-hidden>
      <svg
        className="h-full w-full"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={LEFT_PAGE_PATH} />
        <path d={RIGHT_PAGE_PATH} />
        <text
          x="12"
          y="12.6"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          stroke="none"
          fontSize="5.75"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          letterSpacing="-0.35"
        >
          365
        </text>
      </svg>
    </span>
  )
}
