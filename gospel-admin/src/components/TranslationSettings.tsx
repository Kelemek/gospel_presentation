'use client'

import { useEffect, useState, useRef } from 'react'

interface TranslationSetting {
  translation_code: string
  translation_name: string
  is_enabled: boolean
  display_order: number
}

export default function TranslationSettings() {
  const [settings, setSettings] = useState<TranslationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function loadSettings() {
    try {
      const response = await fetch('/api/admin/translation-settings')
      const data = await response.json()
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error loading translation settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleTranslation(code: string, currentlyEnabled: boolean) {
    if (code === 'esv') {
      alert('ESV cannot be disabled as it is the fallback translation')
      return
    }

    setSaving(code)
    try {
      const response = await fetch('/api/admin/translation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translation_code: code,
          is_enabled: !currentlyEnabled
        })
      })

      if (response.ok) {
        // Update local state
        setSettings(prev => prev.map(s => 
          s.translation_code === code ? { ...s, is_enabled: !currentlyEnabled } : s
        ))
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update translation setting')
      }
    } catch (error) {
      console.error('Error updating translation:', error)
      alert('Failed to update translation setting')
    } finally {
      setSaving(null)
    }
  }

  const enabledCount = settings.filter(s => s.is_enabled).length

  if (loading) {
    return (
      <button className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed">
        Loading...
      </button>
    )
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm flex items-center gap-2"
      >
        <span className="hidden sm:inline">Translations</span>
        <span className="sm:hidden">Trans</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 max-w-[calc(100vw-1rem)] bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800 text-sm">Bible Translations</h3>
            <p className="text-xs text-slate-500 mt-1">Toggle to enable/disable</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {settings.map((setting) => (
              <div
                key={setting.translation_code}
                className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">
                      {setting.translation_code.toUpperCase()}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      setting.is_enabled ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                  
                  <button
                    onClick={() => toggleTranslation(setting.translation_code, setting.is_enabled)}
                    disabled={saving === setting.translation_code || setting.translation_code === 'esv'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      setting.translation_code === 'esv'
                        ? 'bg-slate-300 cursor-not-allowed opacity-50'
                        : setting.is_enabled
                        ? 'bg-green-600'
                        : 'bg-slate-300'
                    }`}
                    title={setting.translation_code === 'esv' ? 'ESV cannot be disabled (fallback)' : `Toggle ${setting.translation_name}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        setting.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 mt-1">{setting.translation_name}</p>
                
                {saving === setting.translation_code && (
                  <p className="text-xs text-blue-600 mt-1">Saving...</p>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-2 border-t border-slate-200 bg-blue-50">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> ESV is the fallback and cannot be disabled.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
