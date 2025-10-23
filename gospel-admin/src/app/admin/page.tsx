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
    // Don't auto-fetch profiles - user can manually load them with button
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
        await fetchProfiles() // Refresh the profile list
        setShowCreateForm(false)
        setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default' })
        setSlugManuallyEdited(false)
        // Show success message could be added here
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
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <AdminHeader
          title="🏠 Admin Dashboard"
          description="Manage gospel presentation profiles, content, and settings"
          showProfileSwitcher={false}
          actions={
            <>
              <Link
                href="/"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm whitespace-nowrap shrink-0"
              >
                <span className="hidden sm:inline">View Site</span>
                <span className="sm:hidden">Site</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-medium transition-all hover:shadow-sm whitespace-nowrap shrink-0"
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Profile Management</h2>
            <button
              onClick={() => {
                setShowCreateForm(true)
                setSlugManuallyEdited(false)
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Create New Profile
            </button>
          </div>

          {showCreateForm && (
            <div className="mb-6 border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Profile</h3>
              
              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={createForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="e.g., Youth Group Presentation"
                    required
                    maxLength={50}
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                    URL Slug (optional)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      yoursite.com/
                    </span>
                    <input
                      type="text"
                      id="slug"
                      value={createForm.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="auto-generated from title"
                      pattern="[a-z0-9]*"
                      maxLength={20}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-generate from title • Only lowercase letters and numbers
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    placeholder="Optional description of this profile..."
                    rows={3}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label htmlFor="cloneFrom" className="block text-sm font-medium text-gray-700 mb-1">
                    Clone From
                  </label>
                  <select
                    id="cloneFrom"
                    value={createForm.cloneFromSlug}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, cloneFromSlug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    {profiles.map(profile => (
                      <option key={profile.slug} value={profile.slug}>
                        {profile.title} ({profile.slug})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The new profile will start with a copy of the selected profile's content
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isCreating || !createForm.title.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {profiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <p className="text-gray-600 mb-4">No profiles loaded</p>
              <p className="text-sm text-gray-500 mb-4">Click the button below to load your profiles.</p>
              <button
                onClick={fetchProfiles}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {isLoading ? 'Loading Profiles...' : 'Load Profiles'}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {profiles.map(profile => (
                <div key={profile.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {profile.title}
                          </h3>
                          {profile.isDefault && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">URL:</span> yoursite.com/{profile.slug}
                        </p>
                        
                        {profile.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {profile.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{profile.visitCount} visits</span>
                          <span>Created {new Date(profile.createdAt).toLocaleDateString()}</span>
                          <span>Updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/${profile.slug}`}
                          target="_blank"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          👁️ View
                        </Link>
                        
                        <Link
                          href={`/admin/profiles/${profile.slug}`}
                          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 transition-colors font-medium"
                        >
                          ⚙️ Settings
                        </Link>
                        
                        <Link
                          href={`/admin/profiles/${profile.slug}/content`}
                          className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200 transition-colors font-medium"
                        >
                          📝 Content
                        </Link>
                        
                        {!profile.isDefault && (
                          <button
                            onClick={() => handleDeleteProfile(profile.slug, profile.title)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            🗑️ Delete
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
