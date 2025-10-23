'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile, GospelSection } from '@/lib/types'
import AdminLogin from '@/components/AdminLogin'
import AdminHeader from '@/components/AdminHeader'
import { isAuthenticated } from '@/lib/auth'

interface ContentEditPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function ContentEditPage({ params }: ContentEditPageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>('')
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null)
  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [newScriptureRef, setNewScriptureRef] = useState('')
  const [addingScriptureToSection, setAddingScriptureToSection] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    setIsAuth(isAuthenticated())
    setIsLoading(false)
  }, [])

  // Resolve params Promise
  useEffect(() => {
    params.then(resolvedParams => {
      setSlug(resolvedParams.slug)
    })
  }, [params])

  useEffect(() => {
    if (slug && isAuth) {
      fetchProfile()
    }
  }, [slug, isAuth])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      } else if (response.status === 404) {
        setError('Profile not found')
      } else {
        setError('Failed to load profile')
      }
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveContent = async () => {
    if (!profile) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gospelData: profile.gospelData
        })
      })

      if (response.ok) {
        setHasChanges(false)
        // Show success message
        alert('Content saved successfully!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to save content')
      }
    } catch (err) {
      setError('Failed to save content')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSection = (sectionIndex: number, field: keyof GospelSection, value: any) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    newGospelData[sectionIndex] = {
      ...newGospelData[sectionIndex],
      [field]: value
    }

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const updateSubsection = (sectionIndex: number, subsectionIndex: number, field: string, value: any) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const newSubsections = [...newGospelData[sectionIndex].subsections]
    newSubsections[subsectionIndex] = {
      ...newSubsections[subsectionIndex],
      [field]: value
    }
    newGospelData[sectionIndex] = {
      ...newGospelData[sectionIndex],
      subsections: newSubsections
    }

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const toggleScriptureFavorite = (sectionIndex: number, subsectionIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.scriptureReferences) {
      const newScriptures = [...subsection.scriptureReferences]
      newScriptures[scriptureIndex] = {
        ...newScriptures[scriptureIndex],
        favorite: !newScriptures[scriptureIndex].favorite
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
    }
  }

  const addScriptureReference = (sectionIndex: number, subsectionIndex: number) => {
    if (!profile || !newScriptureRef.trim()) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    
    const newScriptures = subsection.scriptureReferences || []
    newScriptures.push({
      reference: newScriptureRef.trim(),
      favorite: false
    })
    
    updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
    setNewScriptureRef('')
    setAddingScriptureToSection(null)
  }

  const removeScriptureReference = (sectionIndex: number, subsectionIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.scriptureReferences) {
      const newScriptures = [...subsection.scriptureReferences]
      newScriptures.splice(scriptureIndex, 1)
      updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
    }
  }

  // Nested subsection functions
  const toggleNestedScriptureFavorite = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].scriptureReferences) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      const newScriptures = [...newNestedSubsections[nestedIndex].scriptureReferences!]
      newScriptures[scriptureIndex] = {
        ...newScriptures[scriptureIndex],
        favorite: !newScriptures[scriptureIndex].favorite
      }
      newNestedSubsections[nestedIndex] = {
        ...newNestedSubsections[nestedIndex],
        scriptureReferences: newScriptures
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
    }
  }

  const removeNestedScriptureReference = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].scriptureReferences) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      const newScriptures = [...newNestedSubsections[nestedIndex].scriptureReferences!]
      newScriptures.splice(scriptureIndex, 1)
      newNestedSubsections[nestedIndex] = {
        ...newNestedSubsections[nestedIndex],
        scriptureReferences: newScriptures
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
    }
  }

  const handleLogin = () => {
    setIsAuth(true)
  }

  if (!isAuth) {
    return <AdminLogin onLogin={handleLogin} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" role="status" aria-label="Loading"></div>
          <p className="text-slate-600">Loading profile content...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-lg">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/admin"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* Header */}
        <AdminHeader
          title={profile ? `📝 ${profile.title}` : "📝 Content Editor"}
          description={profile?.description || "Edit gospel presentation content and scripture references"}
          currentProfileSlug={slug}
          showProfileSwitcher={true}
          actions={
            <>
              <Link
                href={`/admin/profiles/${slug}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Profile Settings
              </Link>
              <Link
                href={`/${slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Preview →
              </Link>
              <button
                onClick={handleSaveContent}
                disabled={isSaving || !hasChanges}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
              </button>
            </>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Content Editor */}
        {profile && profile.gospelData.map((section, sectionIndex) => (
          <div key={section.section} className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-lg">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800">
                  {section.section}. {section.title}
                </h2>
                <button
                  onClick={() => setEditingSectionId(editingSectionId === sectionIndex ? null : sectionIndex)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {editingSectionId === sectionIndex ? 'Cancel' : 'Edit Section'}
                </button>
              </div>

              {editingSectionId === sectionIndex && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Section Title
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subsections */}
            <div className="space-y-6">
              {section.subsections.map((subsection, subsectionIndex) => (
                <div key={subsectionIndex} className="border-l-4 border-slate-300 pl-6 mb-6 bg-slate-50 rounded-r-lg py-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-slate-800">
                      {subsection.title}
                    </h3>
                    <button
                      onClick={() => {
                        const id = `${sectionIndex}-${subsectionIndex}`
                        setEditingSubsectionId(editingSubsectionId === id ? null : id)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex-shrink-0 ml-4"
                    >
                      {editingSubsectionId === `${sectionIndex}-${subsectionIndex}` ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {editingSubsectionId === `${sectionIndex}-${subsectionIndex}` && (
                    <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Subsection Title
                          </label>
                          <input
                            type="text"
                            value={subsection.title}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Content
                          </label>
                          <textarea
                            value={subsection.content}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'content', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-slate-700 mb-4 leading-relaxed">
                    {subsection.content}
                  </p>

                  {/* Scripture References */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-slate-700">Scripture References:</h4>
                      <button
                        onClick={() => {
                          const sectionKey = `${sectionIndex}-${subsectionIndex}`
                          setAddingScriptureToSection(addingScriptureToSection === sectionKey ? null : sectionKey)
                          setNewScriptureRef('')
                        }}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        {addingScriptureToSection === `${sectionIndex}-${subsectionIndex}` ? 'Cancel' : '+ Add Scripture'}
                      </button>
                    </div>

                    {addingScriptureToSection === `${sectionIndex}-${subsectionIndex}` && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newScriptureRef}
                            onChange={(e) => setNewScriptureRef(e.target.value)}
                            placeholder="e.g., John 3:16"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addScriptureReference(sectionIndex, subsectionIndex)
                              }
                            }}
                          />
                          <button
                            onClick={() => addScriptureReference(sectionIndex, subsectionIndex)}
                            disabled={!newScriptureRef.trim()}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {subsection.scriptureReferences && subsection.scriptureReferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subsection.scriptureReferences.map((scripture, scriptureIndex) => (
                          <div key={scriptureIndex} className="relative group">
                            <button
                              onClick={() => toggleScriptureFavorite(sectionIndex, subsectionIndex, scriptureIndex)}
                              className={`inline-block px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${
                                scripture.favorite
                                  ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border-2 border-blue-400 hover:border-blue-500 font-medium'
                                  : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 hover:border-blue-300'
                              }`}
                            >
                              {scripture.favorite ? '⭐' : '☆'} {scripture.reference}
                            </button>
                            <button
                              onClick={() => removeScriptureReference(sectionIndex, subsectionIndex, scriptureIndex)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Remove scripture"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm italic">No scripture references yet. Click "Add Scripture" to add some.</p>
                    )}
                    
                    <p className="text-xs text-slate-500 mt-2">
                      Click scripture to toggle favorite (⭐), hover and click × to remove
                    </p>
                  </div>

                  {/* Nested Subsections */}
                  {subsection.nestedSubsections && subsection.nestedSubsections.map((nested, nestedIndex) => (
                    <div key={nestedIndex} className="ml-4 mt-4 border-l-2 border-slate-300 pl-4 bg-gradient-to-r from-slate-25 to-blue-25 rounded-r-lg py-3">
                      <h4 className="font-medium text-slate-800 mb-2">{nested.title}</h4>
                      <p className="text-slate-700 text-sm mb-2">{nested.content}</p>
                      
                      {nested.scriptureReferences && nested.scriptureReferences.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {nested.scriptureReferences.map((scripture, scriptureIndex) => (
                            <div key={scriptureIndex} className="relative group">
                              <button
                                onClick={() => toggleNestedScriptureFavorite(sectionIndex, subsectionIndex, nestedIndex, scriptureIndex)}
                                className={`inline-block px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                                  scripture.favorite
                                    ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border border-blue-400 font-medium'
                                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200'
                                }`}
                                title={scripture.favorite ? 'Click to unfavorite' : 'Click to favorite'}
                              >
                                {scripture.favorite ? '⭐' : '☆'} {scripture.reference}
                              </button>
                              <button
                                onClick={() => removeNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex, scriptureIndex)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                title="Remove scripture"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}