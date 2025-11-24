'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile } from '@/lib/types'
import AdminHeader from '@/components/AdminHeader'
import { createClient } from '@/lib/supabase/client'
import RichTextEditor from '@/components/RichTextEditor'

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
  const [usernameInput, setUsernameInput] = useState('')
  const [isTypingCustomEmail, setIsTypingCustomEmail] = useState(false)
  const [profileAccess, setProfileAccess] = useState<any[]>([])
  const [isLoadingAccess, setIsLoadingAccess] = useState(false)
  const [isAddingCounselee, setIsAddingCounselee] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ email: string; role: string; username?: string }>>([])
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoringBackup, setIsRestoringBackup] = useState(false)

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
      // Call the API endpoint instead of querying directly
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        console.error('Failed to load users:', await response.text())
        return
      }
      
      const data = await response.json()
      setAvailableUsers(data.users || [])
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

    // Username is always required
    if (!usernameInput.trim()) {
      setAccessError('Username is required')
      return
    }

    setIsAddingCounselee(true)
    setAccessError('')

    try {
      const response = await fetch(`/api/profiles/${slug}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: counseleeEmailInput.trim(),
          username: usernameInput.trim()
        })
      })

      if (response.ok) {
        // Update the description to prepend the username
        const currentCounselees = profileAccess.map(a => a.user_email)
        const updatedCounselees = [...currentCounselees, counseleeEmailInput.trim()]
        
        // Build the display list with usernames
        const displayList = updatedCounselees.map(email => {
          if (email === counseleeEmailInput.trim()) {
            return usernameInput.trim()
          }
          const access = profileAccess.find(a => a.user_email === email)
          return access?.username || email.split('@')[0]
        }).join(', ')
        
        // Extract the original description (without the "For:" prefix if it exists)
        let baseDescription = editForm.description
        if (editForm.description.startsWith('For: ')) {
          const forEndIndex = editForm.description.indexOf('\n\n')
          if (forEndIndex !== -1) {
            baseDescription = editForm.description.substring(forEndIndex + 2)
          }
        }
        
        // Build new description with usernames
        const newDescription = `For: ${displayList}\n\n${baseDescription}`
        
        // Update the profile description
        await fetch(`/api/profiles/${slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editForm.title,
            description: newDescription
          })
        })
        
        // Update local state
        setEditForm(prev => ({ ...prev, description: newDescription }))
        
        setCounseleeEmailInput('')
        setUsernameInput('')
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
        // Update the description to remove the username
        const updatedCounselees = profileAccess.filter(a => a.user_email !== email)
        
        // Extract the original description (without the "For:" prefix)
        let baseDescription = editForm.description
        if (editForm.description.startsWith('For: ')) {
          const forEndIndex = editForm.description.indexOf('\n\n')
          if (forEndIndex !== -1) {
            baseDescription = editForm.description.substring(forEndIndex + 2)
          }
        }
        
        // Build new description
        let newDescription = baseDescription
        if (updatedCounselees.length > 0) {
          const displayList = updatedCounselees.map(access => 
            access.username || access.user_email.split('@')[0]
          ).join(', ')
          newDescription = `For: ${displayList}\n\n${baseDescription}`
        }
        
        // Update the profile description
        await fetch(`/api/profiles/${slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: editForm.title,
            description: newDescription
          })
        })
        
        // Update local state
        setEditForm(prev => ({ ...prev, description: newDescription }))
        
        await fetchProfileAccess()
      } else {
        const errorData = await response.json().catch(() => ({}))
        setAccessError(errorData.error || 'Failed to remove counselee')
      }
    } catch (err) {
      setAccessError('Failed to remove counselee')
    }
  }

  const handleDownloadBackup = async () => {
    if (!profile) return
    
    try {
      setError('')
      setIsBackingUp(true)
      
      // Fetch the complete profile data (including gospelData)
      const response = await fetch(`/api/profiles/${slug}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile data')
      }
      
      const data = await response.json()
      const fullProfile = data.profile
      
      const backupData = {
        profile: {
          id: fullProfile.id,
          slug: fullProfile.slug,
          title: fullProfile.title,
          description: fullProfile.description,
          isDefault: fullProfile.isDefault,
          visitCount: fullProfile.visitCount,
          createdAt: fullProfile.createdAt,
          updatedAt: fullProfile.updatedAt,
          lastVisited: fullProfile.lastVisited,
          lastViewedScripture: fullProfile.lastViewedScripture,
          gospelData: fullProfile.gospelData
        },
        backup: {
          exportedAt: new Date().toISOString(),
          exportedBy: 'Gospel Presentation Admin',
          version: '1.0'
        }
      }

      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gospel-profile-${profile.slug}-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download backup'
      setError(`Backup failed: ${errorMessage}`)
      alert(`Backup failed: ${errorMessage}`)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    if (!confirm(`Are you sure you want to restore "${profile.title}" from "${file.name}"? This will replace all current content and cannot be undone.`)) {
      event.target.value = '' // Reset the input
      return
    }

    try {
      setError('')
      setIsRestoringBackup(true)
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      // Support both new format (with profile object) and old format (with gospelData at root)
      let dataToRestore
      if (backupData.profile) {
        // New format - full profile backup
        dataToRestore = {
          title: backupData.profile.title,
          description: backupData.profile.description,
          gospelData: backupData.profile.gospelData,
          lastViewedScripture: backupData.profile.lastViewedScripture
        }
      } else if (backupData.gospelData) {
        // Old format - just gospelData
        dataToRestore = {
          gospelData: backupData.gospelData
        }
      } else {
        throw new Error('Invalid backup file format: missing profile or gospelData')
      }

      // Validate gospelData structure
      if (!dataToRestore.gospelData || !Array.isArray(dataToRestore.gospelData)) {
        throw new Error('Invalid backup file format: gospelData must be an array')
      }

      // Auto-save the restored content
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToRestore)
      })

      if (response.ok) {
        // Refresh profile to show updated data
        await fetchProfile()
        alert(`Successfully restored content for "${profile.title}" from "${file.name}"!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save restored content')
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      alert(`Restore failed: ${errorMessage}`)
    } finally {
      setIsRestoringBackup(false)
      event.target.value = '' // Reset the input
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
              Back
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
          title={profile ? profile.title : "Profile Settings"}
          description={profile?.description || "Configure profile settings and information"}
          currentProfileSlug={slug}
          showProfileSwitcher={true}
          actions={
            <Link
              href="/admin"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              ← Back
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Resource Information</h2>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-slate-700 mb-1">
                URL
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
                URL cannot be changed after profile creation
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Mark Larson's Gospel Presentation"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                placeholder="Optional description of this profile's purpose"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                rows={4}
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
            <div className="flex gap-2 flex-col">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const user = availableUsers.find(u => u.email === e.target.value)
                      setCounseleeEmailInput(e.target.value)
                      setUsernameInput(user?.username || '')
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 shadow-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingCounselee}
                >
                  <option value="">Select existing user...</option>
                  {availableUsers.map(user => (
                    <option key={user.email} value={user.email}>
                      {user.username || user.email} ({user.role})
                    </option>
                  ))}
                </select>
                <input
                  type="email"
                  value={counseleeEmailInput}
                  onChange={(e) => {
                    const email = e.target.value
                    setCounseleeEmailInput(email)
                    // If matches existing user, populate their username
                    const user = availableUsers.find(u => u.email === email.trim())
                    if (user) {
                      setUsernameInput(user.username || '')
                    } else {
                      // Clear username if email doesn't match any existing user
                      setUsernameInput('')
                    }
                  }}
                  placeholder="Or type email address..."
                  className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAddingCounselee}
                />
              </div>

              {/* Username Field - Always show */}
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Username *"
                className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAddingCounselee}
              />
              
              <button
                type="submit"
                disabled={isAddingCounselee || !counseleeEmailInput.trim() || !counseleeEmailInput.includes('@') || !usernameInput.trim()}
                className="bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md border border-green-200 hover:border-green-300 whitespace-nowrap"
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
                    className="text-red-700 hover:text-red-800 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
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

        {/* Backup and Restore */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Backup & Restore</h2>
          <p className="text-sm text-slate-600 mb-4">Download a backup of this profile or restore from a previously saved backup file.</p>
          
          <div className="flex gap-3">
            <button
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="flex-1 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md border border-green-200 hover:border-green-300"
            >
              {isBackingUp ? 'Downloading...' : 'Download Backup'}
            </button>
            <label className="flex-1 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 cursor-pointer text-center shadow-sm hover:shadow-md border border-green-200 hover:border-green-300 whitespace-nowrap">
              {isRestoringBackup ? 'Restoring...' : 'Restore Backup'}
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                disabled={isRestoringBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Named export for testing
export { ProfileEditPage }
export default ProfileEditPage