'use client'

import { useSyncExternalStore } from 'react'

type OpenBookIconProps = {
  className?: string
}

/** Heroicons-style pages meeting at the top; spine at x=12. */
const LEFT_PAGE_PATH =
  'M12 6.253C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253'

const RIGHT_PAGE_PATH =
  'M12 6.253C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'

const LEFT_PAGE_CLOSED = `${LEFT_PAGE_PATH} L12 19.25 Z`

const SPINE_X = 12
const SPINE_TOP_Y = 6.253
const SPINE_BOTTOM_Y = 19.25
const SPINE_Y = 12.5
const FLIP_DUR = '5s'

function BookSpine() {
  return (
    <line
      className="open-book-animated-icon__spine"
      x1={SPINE_X}
      y1={SPINE_TOP_Y}
      x2={SPINE_X}
      y2={SPINE_BOTTOM_Y}
    />
  )
}

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getReducedMotionSnapshot() {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type TurningPageProps = {
  scaleValues: string
  scaleKeyTimes: string
  sheetOpacityValues: string
  sheetOpacityKeyTimes: string
}

/** One sheet: fold at spine (scaleX → 0), then land on the right (scaleX → −1). */
function TurningPage({
  scaleValues,
  scaleKeyTimes,
  sheetOpacityValues,
  sheetOpacityKeyTimes,
}: TurningPageProps) {
  return (
    <g transform={`translate(${SPINE_X} ${SPINE_Y})`}>
      <g className="open-book-animated-icon__flip-sheet">
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="scale"
          values={scaleValues}
          keyTimes={scaleKeyTimes}
          dur={FLIP_DUR}
          repeatCount="indefinite"
          calcMode="linear"
        />
        <animate
          attributeName="opacity"
          values={sheetOpacityValues}
          keyTimes={sheetOpacityKeyTimes}
          dur={FLIP_DUR}
          repeatCount="indefinite"
        />
        <g transform={`translate(${-SPINE_X} ${-SPINE_Y})`}>
          <path
            className="open-book-animated-icon__sheet"
            d={LEFT_PAGE_CLOSED}
            fill="currentColor"
            fillOpacity={0.14}
          />
        </g>
      </g>
    </g>
  )
}

/** Open book: one page turns left → spine → right (M'Cheyne row). */
export function OpenBookIcon({ className = 'w-6 h-6 shrink-0' }: OpenBookIconProps) {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  )

  return (
    <span className={`open-book-animated-icon relative inline-block ${className}`} aria-hidden>
      <svg
        className="open-book-animated-icon__stage h-full w-full overflow-visible"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {reduceMotion ? (
          <>
            <path className="open-book-animated-icon__left" d={LEFT_PAGE_PATH} />
            <path className="open-book-animated-icon__right" d={RIGHT_PAGE_PATH} />
            <BookSpine />
          </>
        ) : (
          <>
            <path className="open-book-animated-icon__left-fixed" d={LEFT_PAGE_PATH} />
            <path className="open-book-animated-icon__right" d={RIGHT_PAGE_PATH} />
            <TurningPage
              scaleValues="1 1; 0.06 1; 0.06 1; -1 1; -1 1; -1 1; 1 1; 1 1"
              scaleKeyTimes="0; 0.22; 0.28; 0.52; 0.82; 0.86; 0.999; 1"
              sheetOpacityValues="0; 1; 1; 1; 1; 0; 0; 0"
              sheetOpacityKeyTimes="0; 0.04; 0.22; 0.52; 0.82; 0.86; 0.861; 1"
            />
            <BookSpine />
          </>
        )}
      </svg>
    </span>
  )
}
