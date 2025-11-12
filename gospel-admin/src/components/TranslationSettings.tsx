'use client'

import { useEffect, useState } from 'react'

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

  useEffect(() => {
    loadSettings()
  }, [])

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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Bible Translation Settings</h3>
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-slate-800 mb-2">Bible Translation Settings</h3>
      <p className="text-sm text-slate-600 mb-4">
        Control which Bible translations are available site-wide. Disabled translations will not appear in dropdowns, and users with disabled translations will automatically use ESV.
      </p>

      <div className="space-y-3">
        {settings.map((setting) => (
          <div
            key={setting.translation_code}
            className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-medium text-slate-800">{setting.translation_name}</h4>
              <p className="text-xs text-slate-500 mt-1">Code: {setting.translation_code.toUpperCase()}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                setting.is_enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {setting.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
              
              <button
                onClick={() => toggleTranslation(setting.translation_code, setting.is_enabled)}
                disabled={saving === setting.translation_code || setting.translation_code === 'esv'}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  setting.translation_code === 'esv'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : setting.is_enabled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                title={setting.translation_code === 'esv' ? 'ESV cannot be disabled' : ''}
              >
                {saving === setting.translation_code ? (
                  'Saving...'
                ) : setting.is_enabled ? (
                  'Disable'
                ) : (
                  'Enable'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> ESV cannot be disabled as it serves as the fallback translation when a user's preferred translation is unavailable.
        </p>
      </div>
    </div>
  )
}
