'use client'

import { useState, useEffect } from 'react'

interface ComaModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ComaModal({ isOpen, onClose }: ComaModalProps) {
  const [instructions, setInstructions] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadInstructions()
    }
  }, [isOpen])

  const loadInstructions = async () => {
    try {
      const response = await fetch('/api/coma-template')
      if (response.ok) {
        const data = await response.json()
        let rawInstructions = data.template?.instructions || ''
        
        // If instructions are empty or just whitespace, provide a default message
        if (!rawInstructions || rawInstructions.trim() === '') {
          setInstructions('<p>COMA instructions are not currently available. Please contact your counselor.</p>')
        } else {
          // Convert plain text to HTML if it doesn't contain HTML tags
          const hasHtmlTags = /<[^>]+>/.test(rawInstructions)
          if (!hasHtmlTags) {
            // Convert newlines to <br> tags and wrap in paragraph
            const formatted = rawInstructions
              .split('\n\n')
              .map((para: string) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
              .join('')
            setInstructions(formatted)
          } else {
            setInstructions(rawInstructions)
          }
        }
      } else {
        console.error('Failed to fetch COMA template, status:', response.status)
        setInstructions('<p>Unable to load COMA instructions. Please contact your counselor.</p>')
      }
    } catch (error) {
      console.error('Failed to load COMA instructions:', error)
      setInstructions('<p>Unable to load COMA instructions. Please contact your counselor.</p>')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">C.O.M.A. Method</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div 
              className="prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: instructions }}
            />
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
