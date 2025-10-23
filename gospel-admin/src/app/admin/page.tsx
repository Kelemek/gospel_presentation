'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLogin from '@/components/AdminLogin'
import { isAuthenticated, logout } from '@/lib/auth'
import { gospelPresentationData } from '@/lib/data'

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editData, setEditData] = useState(gospelPresentationData)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Check authentication on mount
  useEffect(() => {
    setIsAuth(isAuthenticated())
    setIsLoading(false)
  }, [])

  const handleLogin = () => {
    setIsAuth(true)
  }

  const handleLogout = () => {
    logout()
    setIsAuth(false)
  }

  const handleSectionEdit = (sectionIndex: number, field: string, value: string) => {
    const newData = [...editData]
    if (field === 'title') {
      newData[sectionIndex].title = value
    }
    setEditData(newData)
    setHasChanges(true)
  }

  const handleSubsectionEdit = (sectionIndex: number, subsectionIndex: number, field: string, value: string) => {
    const newData = [...editData]
    if (field === 'title') {
      newData[sectionIndex].subsections[subsectionIndex].title = value
    } else if (field === 'content') {
      newData[sectionIndex].subsections[subsectionIndex].content = value
    }
    setEditData(newData)
    setHasChanges(true)
  }

  const saveChanges = async () => {
    setSaveStatus('saving')
    
    try {
      // Create the updated data file content
      const dataContent = `// Gospel Presentation Data - Updated ${new Date().toISOString()}
import { GospelSection } from './types'

export const gospelPresentationData: GospelSection[] = ${JSON.stringify(editData, null, 2)}`

      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: dataContent,
          password: 'gospel2024' // In production, get from auth context
        }),
      })

      if (response.ok) {
        setSaveStatus('saved')
        setHasChanges(false)
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuth) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                📝 Gospel Presentation Editor
              </h1>
              <p className="text-slate-600 mt-1">
                Edit content, scripture references, and presentation structure
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <button
                  onClick={saveChanges}
                  disabled={saveStatus === 'saving'}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? '💾 Saving...' : '💾 Save Changes'}
                </button>
              )}
              {saveStatus === 'saved' && (
                <span className="text-green-600 text-sm">✅ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600 text-sm">❌ Save failed</span>
              )}
              <Link 
                href="/"
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md font-medium transition-colors"
              >
                �️ View Site
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                🔓 Logout
              </button>
            </div>
          </div>
        </div>

        {/* Editing Interface */}
        <div className="space-y-6">
          {editData.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section {section.section} Title
                </label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleSectionEdit(sectionIndex, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                />
              </div>

              <div className="space-y-4">
                {section.subsections.map((subsection, subsectionIndex) => (
                  <div key={subsectionIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subsection Title
                      </label>
                      <input
                        type="text"
                        value={subsection.title}
                        onChange={(e) => handleSubsectionEdit(sectionIndex, subsectionIndex, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium"
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                      </label>
                      <textarea
                        value={subsection.content}
                        onChange={(e) => handleSubsectionEdit(sectionIndex, subsectionIndex, 'content', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-normal leading-relaxed"
                      />
                    </div>

                    {subsection.scriptureReferences && subsection.scriptureReferences.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scripture References
                        </label>
                        <div className="space-y-2">
                          {subsection.scriptureReferences.map((ref, refIndex) => (
                            <div key={refIndex} className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                              📖 {ref.reference}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}