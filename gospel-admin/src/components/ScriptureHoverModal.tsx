'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Capacitor } from '@capacitor/core'
import { formatScriptureApiError } from '@/lib/format-scripture-api-error'

interface ScriptureHoverModalProps {
  reference: string
  children: React.ReactNode
  hoverDelayMs?: number // Optional hover delay in milliseconds, defaults to 500ms
}

interface ScriptureData {
  reference: string
  text: string
  translation?: string
}

export default function ScriptureHoverModal({ reference, children, hoverDelayMs = 500 }: ScriptureHoverModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [scriptureData, setScriptureData] = useState<ScriptureData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isAbove, setIsAbove] = useState(true)
  
  const { translation } = useTranslation()
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [openedByLongPress, setOpenedByLongPress] = useState(false)

  // Clear cached scripture when translation changes
  useEffect(() => {
    setScriptureData(null)
  }, [translation])

  const fetchScriptureText = async () => {
    if (scriptureData) return // Already fetched

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/scripture?reference=${encodeURIComponent(reference)}&translation=${translation}`)
      const data = await response.json()

      if (response.ok) {
        setScriptureData(data)
      } else {
        setError(formatScriptureApiError(data) || 'Failed to fetch scripture text')
      }
    } catch {
      setError('Network error while fetching scripture')
    } finally {
      setLoading(false)
    }
  }

  const setPositionFromPoint = (centerX: number, centerY: number) => {
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const modalWidth = Math.min(320, screenWidth - 40)
    const modalHeight = 150
    const padding = 20

    let x = centerX
    let y = centerY - 10

    if (x - modalWidth / 2 < padding) {
      x = modalWidth / 2 + padding
    } else if (x + modalWidth / 2 > window.innerWidth - padding) {
      x = window.innerWidth - modalWidth / 2 - padding
    }

    let positionAbove = true
    if (y - modalHeight < padding) {
      const belowY = centerY + 10
      if (belowY + modalHeight + padding < screenHeight) {
        y = belowY
        positionAbove = false
      } else {
        y = Math.max(modalHeight + padding, centerY - 10)
      }
    }

    setPosition({ x, y })
    setIsAbove(positionAbove)
  }

  const isTouchOnly =
    typeof window !== 'undefined' &&
    (Capacitor.isNativePlatform() || (typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches))

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isTouchOnly) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    setPositionFromPoint(centerX, centerY)

    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      setOpenedByLongPress(false)
      if (!scriptureData && !loading) {
        fetchScriptureText()
      }
    }, hoverDelayMs)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsVisible(false)
    setOpenedByLongPress(false)
  }

  const LONG_PRESS_MS = 500

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchOnly) return
    const touch = e.changedTouches[0] ?? e.touches[0]
    if (!touch) return
    longPressTriggeredRef.current = false
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    const clientX = touch.clientX
    const clientY = touch.clientY
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTimeoutRef.current = null
      longPressTriggeredRef.current = true
      setPositionFromPoint(clientX, clientY)
      setIsVisible(true)
      setOpenedByLongPress(true)
      if (!scriptureData && !loading) {
        fetchScriptureText()
      }
    }, LONG_PRESS_MS)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    if (longPressTriggeredRef.current) {
      e.preventDefault()
      e.stopPropagation()
      longPressTriggeredRef.current = false
      // Close verse when finger lifts after long-press
      setIsVisible(false)
      setOpenedByLongPress(false)
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    longPressTriggeredRef.current = false
  }

  const closeLongPressPopup = () => {
    if (openedByLongPress) {
      setIsVisible(false)
      setOpenedByLongPress(false)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current)
    }
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className="relative select-none"
      >
        {children}
      </div>

      {/* Backdrop to close long-press popup when tapping outside */}
      {isVisible && openedByLongPress && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden
          onClick={closeLongPressPopup}
          onTouchEnd={(e) => {
            e.preventDefault()
            closeLongPressPopup()
          }}
        />
      )}

      {/* Modal */}
      {isVisible && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl p-6 w-96 max-w-[calc(100vw-40px)] min-h-[60px]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
            pointerEvents: openedByLongPress ? 'auto' : 'none'
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <div className="w-5 h-5 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-base md:text-lg">Loading verse...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-base md:text-lg">
              <p className="font-medium">Error loading verse:</p>
              <p>{error}</p>
            </div>
          ) : scriptureData ? (
            <div className="text-slate-700 dark:text-slate-200">
              <div className="font-medium text-slate-900 dark:text-slate-100 mb-2 text-base md:text-lg">
                {scriptureData.reference}
              </div>
              <div className="text-base md:text-lg leading-relaxed">
                {scriptureData.text}
              </div>
            </div>
          ) : (
            <div className="text-slate-600 dark:text-slate-400 text-base md:text-lg">
              Hover for 1 second to load verse text
            </div>
          )}

          {/* Arrow - points down when above, points up when below */}
          {isAbove ? (
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-slate-800"
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
            />
          ) : (
            <div 
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white dark:border-b-slate-800"
              style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.1))' }}
            />
          )}
        </div>
      )}
    </>
  )
}