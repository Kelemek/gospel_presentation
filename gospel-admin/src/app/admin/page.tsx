'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLogin from '@/components/AdminLogin'
import { isAuthenticated, logout } from '@/lib/auth'
import { GospelSection } from '@/lib/types'

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editData, setEditData] = useState<GospelSection[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Check authentication on mount and load data
  useEffect(() => {
    setIsAuth(isAuthenticated())
    setIsLoading(false)
    
    // Load data from GitHub API
    const loadData = async () => {
      try {
        const response = await fetch('/api/data')
        if (response.ok) {
          const data = await response.json()
          setEditData(data)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    
    loadData()
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

  const addScriptureReference = (sectionIndex: number, subsectionIndex: number) => {
    const newData = [...editData]
    if (!newData[sectionIndex].subsections[subsectionIndex].scriptureReferences) {
      newData[sectionIndex].subsections[subsectionIndex].scriptureReferences = []
    }
    newData[sectionIndex].subsections[subsectionIndex].scriptureReferences!.push({
      reference: 'New Reference'
    })
    setEditData(newData)
    setHasChanges(true)
  }

  const editScriptureReference = (sectionIndex: number, subsectionIndex: number, refIndex: number, newReference: string) => {
    const newData = [...editData]
    if (newData[sectionIndex].subsections[subsectionIndex].scriptureReferences) {
      newData[sectionIndex].subsections[subsectionIndex].scriptureReferences![refIndex].reference = newReference
    }
    setEditData(newData)
    setHasChanges(true)
  }

  const removeScriptureReference = (sectionIndex: number, subsectionIndex: number, refIndex: number) => {
    const newData = [...editData]
    if (newData[sectionIndex].subsections[subsectionIndex].scriptureReferences) {
      newData[sectionIndex].subsections[subsectionIndex].scriptureReferences!.splice(refIndex, 1)
      // Clean up empty array
      if (newData[sectionIndex].subsections[subsectionIndex].scriptureReferences!.length === 0) {
        delete newData[sectionIndex].subsections[subsectionIndex].scriptureReferences
      }
    }
    setEditData(newData)
    setHasChanges(true)
  }

  // Functions for nested subsections
  const addNestedScriptureReference = (sectionIndex: number, subsectionIndex: number, nestedIndex: number) => {
    const newData = [...editData]
    const nested = newData[sectionIndex].subsections[subsectionIndex].nestedSubsections?.[nestedIndex]
    if (nested) {
      if (!nested.scriptureReferences) {
        nested.scriptureReferences = []
      }
      nested.scriptureReferences.push({ reference: 'New Reference' })
    }
    setEditData(newData)
    setHasChanges(true)
  }

  const editNestedScriptureReference = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, refIndex: number, newReference: string) => {
    const newData = [...editData]
    const nested = newData[sectionIndex].subsections[subsectionIndex].nestedSubsections?.[nestedIndex]
    if (nested?.scriptureReferences) {
      nested.scriptureReferences[refIndex].reference = newReference
    }
    setEditData(newData)
    setHasChanges(true)
  }

  const removeNestedScriptureReference = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, refIndex: number) => {
    const newData = [...editData]
    const nested = newData[sectionIndex].subsections[subsectionIndex].nestedSubsections?.[nestedIndex]
    if (nested?.scriptureReferences) {
      nested.scriptureReferences.splice(refIndex, 1)
      if (nested.scriptureReferences.length === 0) {
        delete nested.scriptureReferences
      }
    }
    setEditData(newData)
    setHasChanges(true)
  }

  const saveChanges = async () => {
    setSaveStatus('saving')
    
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: editData,
          password: 'gospel2024', // In production, get from auth context
          commitMessage: `Update all gospel presentation data - ${new Date().toISOString()}`
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

  const saveSectionChanges = async (sectionIndex: number) => {
    setSaveStatus('saving')
    
    try {
      const section = editData[sectionIndex]
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: editData,
          password: 'gospel2024', // In production, get from auth context
          commitMessage: `Update Section ${section.section}: ${section.title} - ${new Date().toISOString()}`
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

  const saveSubsectionChanges = async (sectionIndex: number, subsectionIndex: number) => {
    setSaveStatus('saving')
    
    try {
      const section = editData[sectionIndex]
      const subsection = section.subsections[subsectionIndex]
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: editData,
          password: 'gospel2024', // In production, get from auth context
          commitMessage: `Update ${section.title} - ${subsection.title} - ${new Date().toISOString()}`
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
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50"
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save All Changes'}
                </button>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-600 text-sm font-medium">✓ Saved</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-500 text-sm font-medium">✗ Save failed</span>
              )}
              <Link
                href="/"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
              >
                View Site
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
              >
                Logout
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

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Scripture References
                        </label>
                        <button
                          onClick={() => addScriptureReference(sectionIndex, subsectionIndex)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
                        >
                          + Add Reference
                        </button>
                      </div>
                      
                      {subsection.scriptureReferences && subsection.scriptureReferences.length > 0 ? (
                        <div className="space-y-3">
                          {subsection.scriptureReferences.map((ref, refIndex) => (
                            <div key={refIndex} className="flex gap-2 items-center p-3 bg-slate-50 border border-slate-200 rounded-md">
                              <span className="text-slate-500 text-sm">📖</span>
                              <input
                                type="text"
                                value={ref.reference}
                                onChange={(e) => editScriptureReference(sectionIndex, subsectionIndex, refIndex, e.target.value)}
                                className="flex-1 px-3 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-gray-900 bg-white font-medium text-sm"
                                placeholder="e.g., John 3:16"
                              />
                              <button
                                onClick={() => removeScriptureReference(sectionIndex, subsectionIndex, refIndex)}
                                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors group"
                                title="Remove reference"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic border border-gray-200 rounded-md p-3 bg-gray-50">
                          No scripture references yet. Click "Add Reference" to add one.
                        </div>
                      )}
                    </div>

                    {/* Nested Subsections */}
                    {subsection.nestedSubsections && subsection.nestedSubsections.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-gray-300">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Nested Subsections</h4>
                        {subsection.nestedSubsections.map((nested, nestedIndex) => (
                          <div key={nestedIndex} className="mb-4 p-3 bg-white border border-gray-300 rounded-md">
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Nested Title
                              </label>
                              <input
                                type="text"
                                value={nested.title}
                                onChange={(e) => {
                                  const newData = [...editData]
                                  newData[sectionIndex].subsections[subsectionIndex].nestedSubsections![nestedIndex].title = e.target.value
                                  setEditData(newData)
                                  setHasChanges(true)
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-medium text-sm"
                              />
                            </div>
                            
                            <div className="mb-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Nested Content
                              </label>
                              <textarea
                                value={nested.content}
                                onChange={(e) => {
                                  const newData = [...editData]
                                  newData[sectionIndex].subsections[subsectionIndex].nestedSubsections![nestedIndex].content = e.target.value
                                  setEditData(newData)
                                  setHasChanges(true)
                                }}
                                rows={2}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white font-normal text-sm"
                              />
                            </div>

                            {/* Nested Scripture References */}
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-medium text-gray-600">
                                  Scripture References
                                </label>
                                <button
                                  onClick={() => addNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex)}
                                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-xs font-medium transition-all hover:shadow-sm"
                                >
                                  + Add
                                </button>
                              </div>
                              
                              {nested.scriptureReferences && nested.scriptureReferences.length > 0 ? (
                                <div className="space-y-2">
                                  {nested.scriptureReferences.map((ref, refIndex) => (
                                    <div key={refIndex} className="flex gap-2 items-center p-2 bg-slate-50 border border-slate-200 rounded-md">
                                      <span className="text-slate-500 text-xs">📖</span>
                                      <input
                                        type="text"
                                        value={ref.reference}
                                        onChange={(e) => editNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex, refIndex, e.target.value)}
                                        className="flex-1 px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-gray-900 bg-white font-medium text-xs"
                                        placeholder="e.g., Romans 3:23"
                                      />
                                      <button
                                        onClick={() => removeNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex, refIndex)}
                                        className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors group"
                                        title="Remove reference"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 italic border border-gray-200 rounded-md p-2 bg-gray-50">
                                  No references yet.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Subsection Save Button */}
                    <div className="mt-4 pt-3 border-t border-slate-150 flex justify-end">
                      <button
                        onClick={() => saveSubsectionChanges(sectionIndex, subsectionIndex)}
                        disabled={saveStatus === 'saving'}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-xs font-medium transition-all hover:shadow-sm disabled:opacity-50"
                      >
                        {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Section Save Button */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveSectionChanges(sectionIndex)}
                    disabled={saveStatus === 'saving'}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : `Save Section ${section.section}`}
                  </button>
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-600 text-sm font-medium">✓ Saved</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-500 text-sm font-medium">✗ Save failed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}