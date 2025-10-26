'use client'

import { useState, useEffect, useRef } from 'react'

interface ScriptureHoverModalProps {
  reference: string
  children: React.ReactNode
  hoverDelayMs?: number // Optional hover delay in milliseconds, defaults to 1000ms
}

interface ScriptureData {
  reference: string
  text: string
}

export default function ScriptureHoverModal({ reference, children, hoverDelayMs = 1000 }: ScriptureHoverModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [scriptureData, setScriptureData] = useState<ScriptureData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isAbove, setIsAbove] = useState(true)
  
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchScriptureText = async () => {
    if (scriptureData) return // Already fetched

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/scripture?reference=${encodeURIComponent(reference)}`)
      const data = await response.json()

      if (response.ok) {
        setScriptureData(data)
      } else {
        setError(data.error || 'Failed to fetch scripture text')
      }
    } catch (err) {
      setError('Network error while fetching scripture')
    } finally {
      setLoading(false)
    }
  }

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Calculate position with edge detection
    const rect = e.currentTarget.getBoundingClientRect()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const modalWidth = Math.min(320, screenWidth - 40) // max-w-md but constrained to screen width minus padding
    const modalHeight = 150 // estimated modal height
    const padding = 20 // padding from screen edge

    let x = rect.left + rect.width / 2
    let y = rect.top - 10

    // Check horizontal bounds
    if (x - modalWidth / 2 < padding) {
      // Too far left, align to left edge with padding
      x = modalWidth / 2 + padding
    } else if (x + modalWidth / 2 > window.innerWidth - padding) {
      // Too far right, align to right edge with padding
      x = window.innerWidth - modalWidth / 2 - padding
    }

    // Check vertical bounds
    let positionAbove = true
    if (y - modalHeight < padding) {
      // Not enough space above, try positioning below
      const belowY = rect.bottom + 10
      if (belowY + modalHeight + padding < screenHeight) {
        // Enough space below
        y = belowY
        positionAbove = false
      } else {
        // Not enough space above or below, keep above but adjust to fit
        y = Math.max(modalHeight + padding, rect.top - 10)
      }
    }

    setPosition({ x, y })
    setIsAbove(positionAbove)

    // Start timer with custom delay
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      if (!scriptureData && !loading) {
        fetchScriptureText()
      }
    }, hoverDelayMs)
  }

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before 1 second
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    
    // Hide modal
    setIsVisible(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>

      {/* Modal */}
      {isVisible && (
        <div
          className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-xl p-6 max-w-6xl w-96 max-w-[calc(100vw-40px)] min-h-[60px]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: isAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
            pointerEvents: 'none' // Prevent modal from interfering with hover
          }}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-base md:text-lg">Loading verse...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 text-base md:text-lg">
              <p className="font-medium">Error loading verse:</p>
              <p>{error}</p>
            </div>
          ) : scriptureData ? (
            <div className="text-slate-700">
              <div className="font-medium text-slate-900 mb-2 text-base md:text-lg">
                {scriptureData.reference}
              </div>
              <div className="text-base md:text-lg leading-relaxed">
                {scriptureData.text}
              </div>
            </div>
          ) : (
            <div className="text-slate-600 text-base md:text-lg">
              Hover for 1 second to load verse text
            </div>
          )}

          {/* Arrow - points down when above, points up when below */}
          {isAbove ? (
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
            />
          ) : (
            <div 
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"
              style={{ filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.1))' }}
            />
          )}
        </div>
      )}
    </>
  )
}