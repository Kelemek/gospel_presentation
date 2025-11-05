'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile } from '@/lib/types'
import AdminHeader from '@/components/AdminHeader'
import { createClient } from '@/lib/supabase/client'

interface ProfileEditPageProps {
  params: Promise<{
    slug: string
  }>
}

function ProfileEditPage({ params }: ProfileEditPageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>('')
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: ''
  })
  const [counseleeEmailInput, setCounseleeEmailInput] = useState('')
  const [profileAccess, setProfileAccess] = useState<any[]>([])
  const [isLoadingAccess, setIsLoadingAccess] = useState(false)
  const [isAddingCounselee, setIsAddingCounselee] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ email: string; role: string }>>([])

  // Check authentication on mount
  useEffect(() => {
    checkAuth()
    loadAvailableUsers()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuth(!!user)
    if (!user) {
      router.push('/login')
      setIsLoading(false)
    }
    // Don't set isLoading to false here - let fetchProfile handle it
  }

  // Resolve params Promise
  useEffect(() => {
    params.then(resolvedParams => {
      setSlug(resolvedParams.slug)
    })
  }, [params])

  useEffect(() => {
    if (slug && isAuth) {
      fetchProfile()
      fetchProfileAccess()
    }
  }, [slug, isAuth])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/profiles/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setEditForm({
          title: data.profile.title,
          description: data.profile.description || ''
        })
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

  const fetchProfileAccess = async () => {
    if (!slug) return
    
    setIsLoadingAccess(true)
    try {
      const response = await fetch(`/api/profiles/${slug}/access`)
      if (response.ok) {
        const data = await response.json()
        setProfileAccess(data.access || [])
      }
    } catch (err) {
      console.error('Failed to load profile access:', err)
    } finally {
      setIsLoadingAccess(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const supabase = createClient()
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('display_name, role')
        .order('display_name', { ascending: true })
      
      if (profilesError) {
        console.error('Failed to load users for dropdown:', profilesError)
        return
      }
      
      const users = profiles
        .filter((p: any) => p.display_name) // Only include users with emails
        .map((p: any) => ({
          email: p.display_name,
          role: p.role
        }))
      
      setAvailableUsers(users)
    } catch (error) {
      console.error('Error loading available users:', error)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
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
          title: editForm.title,
          description: editForm.description
        })
      })

      if (response.ok) {
        // Successfully saved, redirect back to admin dashboard
        router.push('/admin')
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to save profile')
      }
    } catch (err) {
      setError('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCounselee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!counseleeEmailInput.trim() || !profile) return

    setIsAddingCounselee(true)
    setAccessError('')

    try {
      const response = await fetch(`/api/profiles/${slug}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: counseleeEmailInput.trim()
        })
      })

      if (response.ok) {
        setCounseleeEmailInput('')
        await fetchProfileAccess()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setAccessError(errorData.error || 'Failed to add counselee')
      }
    } catch (err) {
      setAccessError('Failed to add counselee')
    } finally {
      setIsAddingCounselee(false)
    }
  }

  const handleRemoveCounselee = async (email: string) => {
    if (!confirm(`Remove access for ${email}?`)) return

    setAccessError('')

    try {
      const response = await fetch(`/api/profiles/${slug}/access`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        await fetchProfileAccess()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setAccessError(errorData.error || 'Failed to remove counselee')
      }
    } catch (err) {
      setAccessError('Failed to remove counselee')
    }
  }

  if (!isAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/admin"
              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg transition-colors"
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <AdminHeader
          title={profile ? `${profile.title}` : "Profile Settings"}
          description={profile?.description || "Configure profile settings and information"}
          currentProfileSlug={slug}
          showProfileSwitcher={true}
          actions={
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Dashboard
            </Link>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Profile Info Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1">
                URL Slug
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                  yoursite.com/
                </span>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  disabled
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                URL slug cannot be changed after profile creation
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Profile Title *
              </label>
              <input
                type="text"
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                placeholder="e.g., Mark Larson's Gospel Presentation"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                placeholder="Optional description of this profile's purpose"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-700 bg-white hover:bg-slate-50 px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 flex-1 sm:flex-none shadow-sm hover:shadow-md"
              >
                {isSaving ? (
                  <>
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">Saving</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </button>
              <Link
                href="/admin"
                className="border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-700 bg-white hover:bg-slate-50 px-4 sm:px-6 py-2 rounded-lg transition-all duration-200 text-center flex-1 sm:flex-none shadow-sm hover:shadow-md"
              >
                <span className="hidden sm:inline">Cancel</span>
                <span className="sm:hidden">✕</span>
              </Link>
            </div>
          </form>
        </div>

        {/* Counselee Access Management */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Counselee Access</h2>
          <p className="text-sm text-slate-600 mb-4">
            Grant counselees view-only access to this profile. They will receive an email invitation to create an account.
          </p>

          {accessError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="text-red-800 text-sm">{accessError}</div>
            </div>
          )}

          {/* Add Counselee Form */}
          <form onSubmit={handleAddCounselee} className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value && e.target.value !== 'custom') {
                      setCounseleeEmailInput(e.target.value)
                    } else if (e.target.value === 'custom') {
                      setCounseleeEmailInput('')
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 shadow-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 text-sm"
                  disabled={isAddingCounselee}
                >
                  <option value="">Select existing user...</option>
                  {availableUsers.map(user => (
                    <option key={user.email} value={user.email}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                  <option value="custom">--- Type custom email ---</option>
                </select>
                <input
                  type="email"
                  value={counseleeEmailInput}
                  onChange={(e) => setCounseleeEmailInput(e.target.value)}
                  placeholder="Or type email here..."
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-colors"
                  disabled={isAddingCounselee}
                />
              </div>
              <button
                type="submit"
                disabled={isAddingCounselee || !counseleeEmailInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md whitespace-nowrap"
              >
                {isAddingCounselee ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>

          {/* List of Counselees */}
          <div className="space-y-2">
            {isLoadingAccess ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-slate-500">Loading counselees...</p>
              </div>
            ) : profileAccess.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
                No counselees have been granted access yet
              </div>
            ) : (
              profileAccess.map((access) => (
                <div 
                  key={access.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{access.user_email}</div>
                    <div className="text-xs text-slate-500">
                      Added {new Date(access.created_at).toLocaleDateString()}
                      {access.user_id ? ' • Account created' : ' • Invitation pending'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCounselee(access.user_email)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-transparent hover:border-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profile Stats */}
        {profile && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Visits:</span>
                <span className="ml-2 font-medium">{profile.visitCount}</span>
              </div>
              <div>
                <span className="text-slate-500">Created:</span>
                <span className="ml-2 font-medium">{new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Last Updated:</span>
                <span className="ml-2 font-medium">{new Date(profile.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/${slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Live Profile →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Named export for testing
export { ProfileEditPage }
export default ProfileEditPage