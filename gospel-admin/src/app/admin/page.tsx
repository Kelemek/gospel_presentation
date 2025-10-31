'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

function AdminPageContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'counselor' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [siteUrl, setSiteUrl] = useState('yoursite.com')
  const [searchQuery, setSearchQuery] = useState('')
  const [createForm, setCreateForm] = useState({
    title: '',
    slug: '',
    description: '',
    cloneFromSlug: 'default',
    isTemplate: false
  })
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [isRestoringNew, setIsRestoringNew] = useState(false)

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
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    setUserRole((userProfile as any)?.role || 'counselor')
    setIsLoading(false)
    fetchProfiles()
  }

  useEffect(() => {
    // Set the actual site URL from the browser
    if (typeof window !== 'undefined') {
      setSiteUrl(`${window.location.protocol}//${window.location.host}`)
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

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
        cloneFromSlug: createForm.cloneFromSlug || 'default',
        isTemplate: userRole === 'admin' ? createForm.isTemplate : false
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
        setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default', isTemplate: false })
        setSlugManuallyEdited(false)
        
        // Refresh from server to ensure consistency
        await fetchProfiles()
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create profile'
        
        // Check if it's a duplicate slug error
        if (errorMessage.includes('duplicate key') || 
            errorMessage.includes('unique constraint') || 
            errorMessage.includes('profiles_slug_key')) {
          setError('This URL slug is already in use. Please choose a different one.')
        } else {
          setError(errorMessage)
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error'
      
      // Check if it's a duplicate slug error
      if (errorMessage.includes('duplicate key') || 
          errorMessage.includes('unique constraint') || 
          errorMessage.includes('profiles_slug_key')) {
        setError('This URL slug is already in use. Please choose a different one.')
      } else {
        setError('Failed to create profile: ' + errorMessage)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleTitleChange = (title: string) => {
    const newSlug = slugManuallyEdited ? createForm.slug : generateSlug(title)
    setCreateForm(prev => ({
      ...prev,
      title,
      slug: newSlug
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

  const handleDownloadBackup = async (profile: any) => {
    try {
      setError('')
      
      // Fetch the complete profile data (including gospelData)
      const response = await fetch(`/api/profiles/${profile.slug}`)
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
    }
  }

  const handleRestoreBackup = async (profile: any, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm(`Are you sure you want to restore "${profile.title}" from "${file.name}"? This will replace all current content and cannot be undone.`)) {
      event.target.value = '' // Reset the input
      return
    }

    try {
      setError('')
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
      const response = await fetch(`/api/profiles/${profile.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToRestore)
      })

      if (response.ok) {
        // Refresh profiles to show updated data
        await fetchProfiles()
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
      event.target.value = '' // Reset the input
    }
  }

    const handleRestoreNewBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm(`Are you sure you want to create a new profile from "${file.name}"?`)) {
      event.target.value = ''
      return
    }

    try {
      setIsRestoringNew(true)
      setError('')
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      let profileData
      if (backupData.profile) {
        profileData = backupData.profile
      } else if (backupData.gospelData) {
        profileData = {
          title: backupData.title || 'Restored Profile',
          description: backupData.description || '',
          gospelData: backupData.gospelData
        }
      } else {
        throw new Error('Invalid backup file format')
      }

      if (!profileData.gospelData || !Array.isArray(profileData.gospelData)) {
        throw new Error('Invalid backup file format: gospelData must be an array')
      }

      const slug = generateSlug(profileData.title) + '-' + Date.now().toString().slice(-6)

      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: profileData.title,
          slug: slug,
          description: profileData.description,
          gospelData: profileData.gospelData
        })
      })

      if (response.ok) {
        await fetchProfiles()
        alert(`Successfully created new profile "${profileData.title}" from backup!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create profile')
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      alert(`Restore failed: ${errorMessage}`)
    } finally {
      setIsRestoringNew(false)
      event.target.value = ''
    }
  }

  const handleCopyProfileUrl = async (profile: any) => {
    const profileUrl = `${siteUrl}/${profile.slug}`
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(profileUrl)
        alert(`Profile link copied to clipboard!\n\n${profileUrl}\n\nYou can now paste and share this link.`)
      } else {
        // Fallback for browsers that don't support clipboard API
        alert(`Profile URL:\n\n${profileUrl}\n\nPlease copy this link manually.`)
      }
    } catch (error) {
      alert(`Profile URL:\n\n${profileUrl}\n\nPlease copy this link manually.`)
    }
  }

  const handleCreateFromBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsRestoringNew(true)
    setError('')

    try {
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      // Support both new format (with profile object) and old format
      let profileData
      if (backupData.profile) {
        // New format - full profile backup
        profileData = backupData.profile
      } else if (backupData.profileInfo && backupData.gospelData) {
        // Old format from content page
        profileData = {
          ...backupData.profileInfo,
          gospelData: backupData.gospelData
        }
      } else {
        throw new Error('Invalid backup file format')
      }

      // Validate gospelData structure
      if (!profileData.gospelData || !Array.isArray(profileData.gospelData)) {
        throw new Error('Invalid backup file format: gospelData must be an array')
      }

      // Prompt for new slug (can't use the old one as it might exist)
      const newSlug = prompt(
        `Enter a new slug for the restored profile:\n\nOriginal slug: ${profileData.slug}\nOriginal title: ${profileData.title}\n\nNew slug (letters and numbers only):`,
        `${profileData.slug}-restored`
      )

      if (!newSlug) {
        event.target.value = ''
        setIsRestoringNew(false)
        return
      }

      // Clean the slug
      const cleanSlug = newSlug.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!cleanSlug) {
        throw new Error('Invalid slug. Use only letters and numbers.')
      }

      // Create new profile with restored data
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: cleanSlug,
          title: profileData.title,
          description: profileData.description,
          cloneFromSlug: 'default', // Will be overridden by gospelData below
          gospelData: profileData.gospelData
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newProfile = data.profile || data

        // Update the newly created profile with the full backup data
        const updateResponse = await fetch(`/api/profiles/${cleanSlug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gospelData: profileData.gospelData,
            lastViewedScripture: profileData.lastViewedScripture
          })
        })

        if (updateResponse.ok) {
          // Refresh profiles list
          await fetchProfiles()
          alert(`Successfully created profile "${profileData.title}" from backup!\n\nNew slug: ${cleanSlug}`)
        } else {
          throw new Error('Profile created but failed to restore full data')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create profile from backup')
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      alert(`Restore failed: ${errorMessage}`)
    } finally {
      setIsRestoringNew(false)
      event.target.value = '' // Reset the input
    }
  }

  // Filter profiles based on search query
  // Filter profiles: exclude templates and apply search
  const filteredProfiles = profiles.filter(profile => {
    // Exclude template profiles
    if (profile.isTemplate) return false
    
    // Apply search filter
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      profile.title?.toLowerCase().includes(query) ||
      profile.slug?.toLowerCase().includes(query) ||
      profile.description?.toLowerCase().includes(query) ||
      profile.ownerDisplayName?.toLowerCase().includes(query)
    )
  })

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
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
              {userRole === 'admin' && (
                <Link
                  href="/admin/users"
                  className="px-2 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all hover:shadow-md whitespace-nowrap shrink-0 shadow-sm"
                >
                  <span className="hidden sm:inline">Manage Users</span>
                  <span className="sm:hidden">Users</span>
                </Link>
              )}
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 sm:px-4 py-2 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span className="text-sm sm:text-lg">+</span>
                  <span className="hidden sm:inline">New Profile</span>
                  <span className="sm:hidden">New</span>
                </button>
                
                <Link
                  href="/admin/templates"
                  className="px-3 sm:px-4 py-2 border border-purple-300 hover:border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span className="hidden sm:inline">📋 View Templates</span>
                  <span className="sm:hidden">📋</span>
                </Link>
                
                <label className="px-3 sm:px-4 py-2 border border-purple-300 hover:border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer">
                  <span className="hidden sm:inline">{isRestoringNew ? '⏳ Restoring...' : '📦 Create from Backup'}</span>
                  <span className="sm:hidden">{isRestoringNew ? '⏳' : '📦'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleCreateFromBackup}
                    disabled={isRestoringNew}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Search Field */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search profiles by name, URL, description, or owner..."
                  className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm text-slate-900 placeholder-slate-400"
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
                  Found {filteredProfiles.length} of {profiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''}
                </p>
              )}
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
                    URL *
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
                      className="flex-1 px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-slate-200 rounded-r-lg focus:outline-none focus:ring-2 text-slate-900 bg-white shadow-sm text-sm transition-all"
                      placeholder="auto-generated from title"
                      pattern="[a-z0-9]*"
                      maxLength={20}
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-generated from title • Only lowercase letters and numbers
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all resize-y"
                    placeholder="Describe this profile..."
                    rows={3}
                    maxLength={200}
                    required
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
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
                  >
                    {profiles.filter(p => {
                      // Admin can clone from any template or any profile
                      if (userRole === 'admin') {
                        return p.isTemplate || !p.isTemplate
                      }
                      // Counselor can clone from templates or their own profiles
                      return p.isTemplate || p.createdBy === user?.id
                    }).map(profile => (
                      <option key={profile.slug} value={profile.slug}>
                        {profile.title} ({profile.slug})
                        {profile.isTemplate ? ' - Template' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {userRole === 'admin' 
                      ? 'Clone from any template or profile'
                      : 'Clone from templates or your own profiles'}
                  </p>
                </div>

                {userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isTemplate"
                      checked={createForm.isTemplate}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, isTemplate: e.target.checked }))}
                      className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-400"
                    />
                    <label htmlFor="isTemplate" className="text-xs sm:text-sm font-medium text-slate-700">
                      Make this a template profile (editable only by admins, visible to all users)
                    </label>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={isCreating || !createForm.title.trim() || !createForm.slug.trim() || !createForm.description.trim()}
                    className="bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    {isCreating ? 'Creating...' : 'Create Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setCreateForm({ title: '', slug: '', description: '', cloneFromSlug: 'default', isTemplate: false })
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
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-3xl sm:text-4xl mb-4">�</div>
              <p className="text-slate-600 mb-4 text-sm sm:text-base">
                {searchQuery ? 'No profiles match your search' : 'No profiles found'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                {searchQuery ? 'Try a different search term' : 'Create your first profile using the button above to get started.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredProfiles.map(profile => (
                <div key={profile.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                            {profile.title}
                          </h3>
                          {profile.isTemplate && (
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                              Template
                            </span>
                          )}
                          {profile.isDefault && (
                            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium w-fit ml-2">
                              Default
                            </span>
                          )}
                          {profile.isTemplate && !profile.isDefault && (
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                              Template
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          <span className="font-medium">URL:</span> <span className="break-all">{siteUrl}/{profile.slug}</span>
                        </p>
                        
                        {profile.ownerDisplayName && (
                          <p className="text-xs sm:text-sm text-slate-600 mt-1">
                            <span className="font-medium">Owner:</span> {profile.ownerDisplayName}
                          </p>
                        )}
                        
                        {profile.description && (
                          <p className="text-xs sm:text-sm text-slate-600 mt-1">
                            <span className="font-medium">Description:</span> {profile.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-slate-500">
                          <span>{profile.visitCount} visits</span>
                          <span className="hidden sm:inline">Created {new Date(profile.createdAt).toLocaleDateString()}</span>
                          <span>Updated {new Date(profile.updatedAt).toLocaleDateString()}</span>
                          {profile.lastVisited ? (
                            <span>Last visited {new Date(profile.lastVisited).toLocaleDateString()}</span>
                          ) : profile.visitCount === 0 ? (
                            <span className="text-orange-500">Never visited</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/${profile.slug}`}
                            target="_blank"
                            className="text-slate-600 hover:text-slate-800 text-xs sm:text-sm font-medium bg-white hover:bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            View
                          </Link>
                          
                          <button
                            onClick={() => handleCopyProfileUrl(profile)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            Share
                          </button>
                          
                          {/* Hide Settings and Content buttons for non-admins on templates and default profile */}
                          {((!profile.isDefault && !profile.isTemplate) || userRole === 'admin') && (
                            <>
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
                            </>
                          )}
                          
                          {!profile.isDefault && (
                            <button
                              onClick={() => handleDeleteProfile(profile.slug, profile.title)}
                              className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Delete
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Hide backup/restore for non-admins on default profile */}
                          {(!profile.isDefault || userRole === 'admin') && (
                            <>
                              <button
                                onClick={() => handleDownloadBackup(profile)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-2 py-1 rounded text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-blue-200"
                                title="Download profile backup"
                              >
                                <span className="hidden sm:inline">📥 Download Backup</span>
                                <span className="sm:hidden">📥 Backup</span>
                              </button>
                              
                              <label className="bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 px-2 py-1 rounded text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md border border-amber-200 cursor-pointer">
                                <span className="hidden sm:inline">📤 Upload & Restore</span>
                                <span className="sm:hidden">📤 Restore</span>
                                <input
                                  type="file"
                                  accept=".json"
                                  onChange={(e) => handleRestoreBackup(profile, e)}
                                  className="hidden"
                                />
                              </label>
                            </>
                          )}
                        </div>
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

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminPageContent />
    </AdminErrorBoundary>
  )
}
