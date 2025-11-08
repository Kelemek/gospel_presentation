'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

function TemplatesPageContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'counselor' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  const [error, setError] = useState('')
  const [siteUrl, setSiteUrl] = useState('yoursite.com')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }
    
    setUser(user)
    
    // Get user role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userProfile && !profileError) {
      setUserRole((userProfile as any).role as 'admin' | 'counselor')
    }
    
    setIsLoading(false)
    fetchTemplates()
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin)
    }
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const data = await response.json()
        // Filter to only show templates
        setTemplates(data.profiles.filter((p: any) => p.isTemplate))
      } else {
        setError('Failed to fetch templates')
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      setError('Error loading templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyProfileUrl = async (profile: any) => {
    const url = `${siteUrl}/${profile.slug}`
    try {
      await navigator.clipboard.writeText(url)
      alert(`URL copied to clipboard: ${url}`)
    } catch (err) {
      console.error('Failed to copy URL:', err)
      alert('Failed to copy URL')
    }
  }

  const handleDeleteProfile = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the template "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTemplates(templates.filter(t => t.slug !== slug))
        alert(`Template "${title}" deleted successfully`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete template')
      }
    } catch (err: any) {
      setError('Failed to delete template: ' + (err.message || 'Unknown error'))
    }
  }

  const handleDownloadBackup = async (profile: any) => {
    try {
      const response = await fetch(`/api/profiles/${profile.slug}`)
      if (!response.ok) throw new Error('Failed to fetch profile')
      
      const fullProfile = await response.json()
      
      const backupData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        profile: {
          slug: fullProfile.slug,
          title: fullProfile.title,
          description: fullProfile.description,
          isDefault: fullProfile.isDefault,
          isTemplate: fullProfile.isTemplate,
          gospelData: fullProfile.gospelData,
          visitCount: fullProfile.visitCount,
          lastVisited: fullProfile.lastVisited,
          lastViewedScripture: fullProfile.lastViewedScripture,
        }
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${profile.slug}-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading backup:', error)
      alert('Failed to download backup')
    }
  }

  const handleRestoreBackup = async (profile: any, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm(`Are you sure you want to restore "${profile.title}" from "${file.name}"? This will replace all current content and cannot be undone.`)) {
      event.target.value = ''
      return
    }

    try {
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      const profileData = backupData.profile || {
        ...backupData.profileInfo,
        gospelData: backupData.gospelData
      }

      if (!profileData.gospelData || !Array.isArray(profileData.gospelData)) {
        throw new Error('Invalid backup file format: gospelData must be an array')
      }

      const updateData = {
        title: profileData.title || profile.title,
        description: profileData.description || '',
        gospelData: profileData.gospelData,
        lastViewedScripture: profileData.lastViewedScripture
      }

      const response = await fetch(`/api/profiles/${profile.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        alert(`Successfully restored content for "${profile.title}" from "${file.name}"!`)
        await fetchTemplates()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save restored content')
      }
    } catch (error: any) {
      console.error('Error restoring backup:', error)
      alert(`Failed to restore backup: ${error.message}`)
    } finally {
      event.target.value = ''
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Filter templates based on search query
  const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      template.title?.toLowerCase().includes(query) ||
      template.slug?.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.ownerDisplayName?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Template Profiles
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {userRole === 'admin' 
                  ? 'Manage template profiles that can be used to create new profiles' 
                  : 'View available template profiles'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm"
              >
                <span className="hidden sm:inline">← Back to Profiles</span>
                <span className="sm:hidden">← Profiles</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent">Available Templates</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Templates that can be used as a starting point for new profiles
              </p>
            </div>
          </div>

          {/* Search Field */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by name, URL, description, or owner..."
                className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 text-sm text-slate-900 placeholder-slate-400"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-slate-500 mt-2">
                Found {filteredTemplates.length} of {templates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-3xl sm:text-4xl mb-4">🔍</div>
              <p className="text-slate-600 mb-4 text-sm sm:text-base">
                {searchQuery ? 'No templates match your search' : 'No templates found'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                {searchQuery ? 'Try a different search term' : userRole === 'admin' ? 'Create template profiles from the main profiles page' : 'No templates available yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredTemplates.map(template => (
                <div key={template.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                          {template.title}
                        </h3>
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                          Template
                        </span>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        <span className="font-medium">URL:</span> <span className="break-all">{siteUrl}/{template.slug}</span>
                      </p>
                      
                      {template.ownerDisplayName && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          <span className="font-medium">Owner:</span> {template.ownerDisplayName}
                        </p>
                      )}
                      
                      {template.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          <span className="font-medium">Description:</span> {template.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-slate-500">
                        <span>{template.visitCount} visits</span>
                        <span className="hidden sm:inline">Created {new Date(template.createdAt).toLocaleDateString()}</span>
                        <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                        {template.lastVisited ? (
                          <span>Last visited {new Date(template.lastVisited).toLocaleDateString()}</span>
                        ) : template.visitCount === 0 ? (
                          <span className="text-orange-500">Never visited</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${template.slug}`}
                          target="_blank"
                          className="text-slate-600 hover:text-slate-800 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 px-2 sm:px-3 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          View
                        </Link>
                        
                        {/* Only show share button for admins */}
                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleCopyProfileUrl(template)}
                            className="text-slate-600 hover:text-slate-800 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 px-2 sm:px-3 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            Share
                          </button>
                        )}
                        
                        {/* Only show edit buttons for admins */}
                        {userRole === 'admin' && (
                          <>
                            <Link
                              href={`/admin/profiles/${template.slug}`}
                              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300"
                            >
                              Settings
                            </Link>
                            
                            <Link
                              href={`/admin/profiles/${template.slug}/content`}
                              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300"
                            >
                              Edit
                            </Link>
                            
                            {!template.isDefault && (
                              <button
                                onClick={() => handleDeleteProfile(template.slug, template.title)}
                                className="text-slate-600 hover:text-slate-800 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 px-2 sm:px-3 py-1 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Backup/Restore buttons for admins */}
                      {userRole === 'admin' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleDownloadBackup(template)}
                            className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300"
                            title="Download template backup"
                          >
                            Download Backup
                          </button>
                          
                          <label className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-slate-200 hover:border-slate-300 cursor-pointer">
                            Upload & Restore
                            <input
                              type="file"
                              accept=".json"
                              onChange={(e) => handleRestoreBackup(template, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <AdminErrorBoundary>
      <TemplatesPageContent />
    </AdminErrorBoundary>
  )
}

// Named export for testing
export { TemplatesPageContent }
