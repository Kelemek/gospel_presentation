'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GospelProfile, CreateProfileRequest } from '@/lib/types'
import { generateSlugSuggestion } from '@/lib/profile-service'
import AdminLogin from '@/components/AdminLogin'
import { isAuthenticated } from '@/lib/auth'

interface ProfileListItem {
  id: string
  slug: string
  title: string
  description?: string
  isDefault: boolean
  visitCount: number
  createdAt: Date
  updatedAt: Date
}

export default function ProfilesAdminPage() {
  const [profiles, setProfiles] = useState<ProfileListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    description: '',
    cloneFromSlug: 'default'
  })
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)

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
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles)
      } else {
        setError('Failed to load profiles')
      }
    } catch (err) {
      setError('Failed to load profiles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      const request: CreateProfileRequest = {
        slug: createForm.slug.toLowerCase().trim(),
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        cloneFromSlug: createForm.cloneFromSlug || 'default'
      }

      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (response.ok) {
        await fetchProfiles() // Refresh the list
        setShowCreateForm(false)
        setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default' })
        setIsSlugManuallyEdited(false)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create profile')
      }
    } catch (err) {
      setError('Failed to create profile')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteProfile = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the profile "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchProfiles() // Refresh the list
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete profile')
      }
    } catch (err) {
      setError('Failed to delete profile')
    }
  }

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false)

  const handleTitleChange = (title: string) => {
    setCreateForm(prev => ({
      ...prev,
      title,
      // Auto-generate slug suggestion when title changes (only if not manually edited)
      slug: isSlugManuallyEdited ? prev.slug : generateSlugSuggestion(title, profiles.map(p => p.slug))
    }))
  }

  const handleSlugChange = (slug: string) => {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, '')
    setCreateForm(prev => ({ ...prev, slug: cleanSlug }))
    setIsSlugManuallyEdited(true)
  }

  const handleLogin = () => {
    setIsAuth(true)
    fetchProfiles()
  }

  if (!isAuth) {
    return <AdminLogin onLogin={handleLogin} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Management</h1>
        <p className="text-gray-600">
          Create and manage gospel presentation profiles. Each profile can have its own customized content and favorites.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Profile Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setShowCreateForm(true)
            setIsSlugManuallyEdited(false)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Create New Profile
        </button>
      </div>

      {/* Create Profile Form */}
      {showCreateForm && (
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Profile</h2>
          
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
                URL Slug *
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
                  className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="youthgroup"
                  pattern="[a-z][a-z0-9]*"
                  title="Must start with a letter and contain only lowercase letters and numbers"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSlugManuallyEdited(false)
                    setCreateForm(prev => ({
                      ...prev,
                      slug: generateSlugSuggestion(prev.title, profiles.map(p => p.slug))
                    }))
                  }}
                  className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                  title="Regenerate slug from title"
                >
                  ↻
                </button>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  Auto-generated from title • Lowercase letters and numbers only
                </p>
                {isSlugManuallyEdited && (
                  <p className="text-xs text-blue-600">
                    Manual edit mode (click ↻ to regenerate)
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
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
                disabled={isCreating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Profile'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setIsSlugManuallyEdited(false)
                  setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default' })
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Profiles List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            All Profiles ({profiles.length})
          </h2>
        </div>

        {profiles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No profiles found. Create your first profile to get started.
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

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${profile.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </Link>
                    
                    <Link
                      href={`/admin/profiles/${profile.slug}`}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </Link>
                    
                    {!profile.isDefault && (
                      <button
                        onClick={() => handleDeleteProfile(profile.slug, profile.title)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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
  )
}