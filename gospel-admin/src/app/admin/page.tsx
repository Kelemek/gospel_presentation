'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AdminLogin from '@/components/AdminLogin'
import AdminHeader from '@/components/AdminHeader'
import { isAuthenticated, logout } from '@/lib/auth'

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [siteUrl, setSiteUrl] = useState('yoursite.com')
  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    description: '',
    cloneFromSlug: 'default'
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => {
    setIsAuth(isAuthenticated())
    if (isAuthenticated()) {
      fetchProfiles()
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Set the actual site URL from the browser
    if (typeof window !== 'undefined') {
      setSiteUrl(`${window.location.protocol}//${window.location.host}`)
    }
  }, [])

  const fetchProfiles = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles)
      } else {
        setError('Failed to fetch profiles')
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
      setError('Error loading profiles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = () => {
    setIsAuth(true)
    fetchProfiles()
  }

  const handleLogout = () => {
    logout()
    setIsAuth(false)
  }

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 15) || 'profile'
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      const profileData = {
        slug: createForm.slug || generateSlug(createForm.title),
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        cloneFromSlug: createForm.cloneFromSlug || 'default'
      }

      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        const data = await response.json()
        const newProfile = data.profile || data
        
        // Immediately add the new profile to the UI (optimistic update)
        setProfiles(prev => [...prev, newProfile])
        
        // Close the form and reset
        setShowCreateForm(false)
        setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default' })
        setSlugManuallyEdited(false)
        
        // Refresh from server to ensure consistency
        await fetchProfiles()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create profile')
      }
    } catch (err: any) {
      setError('Failed to create profile: ' + (err.message || 'Unknown error'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleTitleChange = (title: string) => {
    setCreateForm(prev => ({
      ...prev,
      title,
      // Auto-generate slug only if user hasn't manually edited it
      slug: slugManuallyEdited ? prev.slug : generateSlug(title)
    }))
  }

  const handleSlugChange = (value: string) => {
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9]/g, '')
    setCreateForm(prev => ({ ...prev, slug: cleanSlug }))
    // Mark as manually edited when user types anything
    setSlugManuallyEdited(true)
  }

  const handleDeleteProfile = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the profile "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setIsLoading(true) // Show loading state during delete
      
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Immediately update the UI by filtering out the deleted profile
        setProfiles(prev => prev.filter(p => p.slug !== slug))
        // Also refresh from server to ensure consistency
        await fetchProfiles()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete profile')
        setIsLoading(false)
      }
    } catch (err: any) {
      setError('Failed to delete profile: ' + (err.message || 'Unknown error'))
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <AdminHeader
          title="Admin Dashboard"
          description="Manage gospel presentation profiles, content, and settings"
          showProfileSwitcher={false}
          actions={
            <>
              <Link
                href="/"
                className="px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm"
              >
                <span className="hidden sm:inline">View Site</span>
                <span className="sm:hidden">Site</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-2 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

                  <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold bg-gradient-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent">Profile Management</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Create, edit, and manage presentation profiles</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-3 sm:px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <span className="text-sm sm:text-lg">+</span>
                <span className="hidden sm:inline">New Profile</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

          {showCreateForm && (
            <div className="mb-6 border border-slate-200 rounded-xl p-4 sm:p-6 bg-gradient-to-br from-white to-slate-50 shadow-md">
              <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent mb-4">Create New Profile</h3>
              
              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Profile Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={createForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all"
                    placeholder="e.g., Youth Group Presentation"
                    required
                    maxLength={50}
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    URL Slug (optional)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2 sm:px-3 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs sm:text-sm">
                      {siteUrl}/
                    </span>
                    <input
                      type="text"
                      id="slug"
                      value={createForm.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all"
                      placeholder="auto-generated from title"
                      pattern="[a-z0-9]*"
                      maxLength={20}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Leave empty to auto-generate from title • Only lowercase letters and numbers
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all resize-y"
                    placeholder="Optional description of this profile..."
                    rows={3}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label htmlFor="cloneFrom" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Clone From
                  </label>
                  <select
                    id="cloneFrom"
                    value={createForm.cloneFromSlug}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, cloneFromSlug: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all"
                  >
                    {profiles.map(profile => (
                      <option key={profile.slug} value={profile.slug}>
                        {profile.title} ({profile.slug})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    The new profile will start with a copy of the selected profile's content
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={isCreating || !createForm.title.trim()}
                    className="bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    {isCreating ? 'Creating...' : 'Create Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default' })
                      setSlugManuallyEdited(false)
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading profiles...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-3xl sm:text-4xl mb-4">📋</div>
              <p className="text-slate-600 mb-4 text-sm sm:text-base">No profiles found</p>
              <p className="text-xs sm:text-sm text-slate-500">Create your first profile using the button above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {profiles.map(profile => (
                <div key={profile.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                            {profile.title}
                          </h3>
                          {profile.isDefault && (
                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          <span className="font-medium">URL:</span> <span className="break-all">{siteUrl}/{profile.slug}</span>
                        </p>
                        
                        {profile.description && (
                          <p className="text-xs sm:text-sm text-slate-600 mt-1">
                            {profile.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-slate-500">
                          <span>{profile.visitCount} visits</span>
                          <span className="hidden sm:inline">Created {new Date(profile.createdAt).toLocaleDateString()}</span>
                          <span>Updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${profile.slug}`}
                          target="_blank"
                          className="text-slate-600 hover:text-slate-800 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          View
                        </Link>
                        
                        <Link
                          href={`/admin/profiles/${profile.slug}`}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-800 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-slate-200"
                        >
                          Settings
                        </Link>
                        
                        <Link
                          href={`/admin/profiles/${profile.slug}/content`}
                          className="bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-700 hover:text-emerald-800 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-emerald-200"
                        >
                          Content
                        </Link>
                        
                        {!profile.isDefault && (
                          <button
                            onClick={() => handleDeleteProfile(profile.slug, profile.title)}
                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            Delete
                          </button>
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
