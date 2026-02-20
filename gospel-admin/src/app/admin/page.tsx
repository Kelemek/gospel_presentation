'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import TranslationSettings from '@/components/TranslationSettings'
import ViewToggle from '@/components/ViewToggle'
import ProfileCard from '@/components/ProfileCard'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { useSessionMonitor } from '@/hooks/useSessionMonitor'
import { useViewPreference } from '@/hooks/useViewPreference'
import { useAlertModal } from '@/contexts/AlertModalContext'

// Small pure helpers exported for testing. Kept additive and isolated from
// React hooks so they can be unit tested without rendering the client UI.
export function generateSlug(title: string) {
  return (title || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .substring(0, 15) || 'profile'
}

export function createProfilePayload(form: {
  title: string
  description?: string
  cloneFromSlug?: string
  isTemplate?: boolean
  counseleeEmails?: string[]
}, userRole: 'admin' | 'counselor' | 'counselee' | null) {
  return {
    title: (form.title || '').trim(),
    description: (form.description || '').trim() || undefined,
    cloneFromSlug: form.cloneFromSlug || 'default',
    isTemplate: userRole === 'admin' ? !!form.isTemplate : false,
    counseleeEmails: (form.counseleeEmails || []).filter((e) => !!(e || '').trim())
  }
}

export function isUniqueConstraintError(errOrMessage: any) {
  const text = typeof errOrMessage === 'string'
    ? errOrMessage
    : (errOrMessage && (errOrMessage.error || errOrMessage.message)) || ''

  return (
    typeof text === 'string' && (
      text.includes('duplicate key') ||
      text.includes('unique constraint') ||
      text.includes('profiles_slug_key')
    )
  )
}

function AdminPageContent() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'counselor' | 'counselee' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profiles, setProfiles] = useState<any[]>([])
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [siteUrl, setSiteUrl] = useState('yoursite.com')
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useViewPreference('list')
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    cloneFromSlug: '',
    isTemplate: false,
    counseleeEmails: [] as string[]
  })
  const [counseleeEmailInput, setCounseleeEmailInput] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [isRestoringNew, setIsRestoringNew] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Array<{ email: string; role: string; username?: string }>>([])
  const [selectedCounselee, setSelectedCounselee] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showCopyToast, setShowCopyToast] = useState(false)
  const { showAlert, showConfirm } = useAlertModal()

  // Monitor session and auto-logout on expiration
  useSessionMonitor({
    checkInterval: 60000, // Check every minute
    enabled: false, // Automatic logout disabled - sessions will not be monitored
    onSessionExpired: () => {
      logger.warn('Session expired, redirecting to login')
      router.push('/login')
    }
  })

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    
    // Prefer getSession() which provides expiry info, but fall back to getUser()
    // because tests (and some older clients) may mock only getUser.
    let session: any = null
    let sessionError: any = null
    let fetchedUser: any = null

    if (typeof (supabase.auth as any).getSession === 'function') {
      const res = await (supabase.auth as any).getSession()
      session = res?.data?.session
      sessionError = res?.error
    } else if (typeof (supabase.auth as any).getUser === 'function') {
      // Construct a lightweight session fallback when getSession isn't available.
      const resUser = await (supabase.auth as any).getUser()
      fetchedUser = resUser?.data?.user
      if (fetchedUser) {
        session = { user: fetchedUser, expires_at: null }
        sessionError = null
      }
    }

    // If no valid session, redirect to login
    if (!session || sessionError) {
      router.push('/login')
      return
    }

    // If we have expiry info, check and try to refresh if expired.
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    const now = Date.now()

    if (expiresAt && expiresAt < now) {
      if (typeof (supabase.auth as any).refreshSession === 'function') {
        const refreshRes = await (supabase.auth as any).refreshSession()
        const refreshedSession = refreshRes?.data?.session
        const refreshError = refreshRes?.error
        if (!refreshedSession || refreshError) {
          router.push('/login')
          return
        }
      } else {
        // No refresh available on this client; force login
        router.push('/login')
        return
      }
    }

    // Ensure we have the user object (may have been fetched above)
    let user = fetchedUser
    if (!user) {
      const { data: { user: gotUser } = {} } = await (supabase.auth as any).getUser()
      user = gotUser
    }

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
    
    // Only load available users for admins and counselors
    const role = (userProfile as any)?.role || 'counselor'
    if (role === 'admin' || role === 'counselor') {
      loadAvailableUsers()
    }
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
      logger.error('Error fetching profiles:', error)
      setError('Error loading profiles')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      // Call the API endpoint instead of using admin.listUsers directly
      const response = await fetch('/api/users')
      
      if (!response.ok) {
        logger.error('Failed to load users:', await response.text())
        return
      }
      
      const data = await response.json()
      setAvailableUsers(data.users || [])
    } catch (error) {
      logger.error('Error loading available users:', error)
    }
  }

  // use the top-level `generateSlug` helper (exported) for consistency

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError('')

    try {
      const profileData = {
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        cloneFromSlug: createForm.cloneFromSlug || 'default',
        isTemplate: userRole === 'admin' ? createForm.isTemplate : false,
        counseleeEmails: createForm.counseleeEmails.filter(e => e.trim())
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
        setCreateForm({ 
          title: '', 
          description: '', 
          cloneFromSlug: '', 
          isTemplate: false,
          counseleeEmails: []
        })
        setCounseleeEmailInput('')
        
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
    setCreateForm(prev => ({
      ...prev,
      title
    }))
  }

  const handleCloneFromChange = (cloneFromSlug: string) => {
    // Find the selected profile to auto-populate title and description
    const selectedProfile = profiles.find(p => p.slug === cloneFromSlug)
    
    if (selectedProfile) {
      setCreateForm(prev => ({
        ...prev,
        cloneFromSlug,
        title: selectedProfile.title,
        description: selectedProfile.description || ''
      }))
    } else {
      setCreateForm(prev => ({
        ...prev,
        cloneFromSlug
      }))
    }
  }

  const handleAddCounseleeEmail = () => {
    const email = counseleeEmailInput.trim().toLowerCase()
    if (email && email.includes('@') && !createForm.counseleeEmails.includes(email)) {
      const updatedEmails = [...createForm.counseleeEmails, email]
      
      // Build the display list with usernames (not emails)
      const displayList = updatedEmails.map(e => {
        const user = availableUsers.find(au => au.email === e)
        // Use username from availableUsers, fallback to custom username input, or email prefix
        return user?.username || usernameInput || e.split('@')[0]
      }).join(', ')
      
      // Extract the original description (without the "For:" prefix if it exists)
      let baseDescription = createForm.description
      if (createForm.description.startsWith('For: ')) {
        const forEndIndex = createForm.description.indexOf('\n\n')
        if (forEndIndex !== -1) {
          baseDescription = createForm.description.substring(forEndIndex + 2)
        }
      }
      
      // Build new description with usernames
      const newDescription = `For: ${displayList}\n\n${baseDescription}`
      
      setCreateForm(prev => ({
        ...prev,
        counseleeEmails: updatedEmails,
        description: newDescription
      }))
      setCounseleeEmailInput('')
      setUsernameInput('')
    }
  }

  const handleRemoveCounseleeEmail = (email: string) => {
    const updatedEmails = createForm.counseleeEmails.filter(e => e !== email)
    
    // Extract the original description (without the "For:" prefix)
    let baseDescription = createForm.description
    if (createForm.description.startsWith('For: ')) {
      const forEndIndex = createForm.description.indexOf('\n\n')
      if (forEndIndex !== -1) {
        baseDescription = createForm.description.substring(forEndIndex + 2)
      }
    }
    
    // Build new description with usernames (not emails)
    let newDescription = baseDescription
    if (updatedEmails.length > 0) {
      const displayList = updatedEmails.map(e => {
        const user = availableUsers.find(au => au.email === e)
        // Use username from user_profiles via availableUsers, not email
        return user?.username || e.split('@')[0]
      }).join(', ')
      newDescription = `For: ${displayList}\n\n${baseDescription}`
    }
    
    setCreateForm(prev => ({
      ...prev,
      counseleeEmails: updatedEmails,
      description: newDescription
    }))
  }

  const handleDeleteProfile = async (slug: string, title: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete the profile "${title}"? This action cannot be undone.`)
    if (!confirmed) return

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDownloadBackup = async (profile: any) => {
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
      showAlert(`Backup failed: ${errorMessage}`)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRestoreBackup = async (profile: any, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const confirmed = await showConfirm(`Are you sure you want to restore "${profile.title}" from "${file.name}"? This will replace all current content and cannot be undone.`)
    if (!confirmed) {
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
        showAlert(`Successfully restored content for "${profile.title}" from "${file.name}"!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save restored content')
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      showAlert(`Restore failed: ${errorMessage}`)
    } finally {
      event.target.value = '' // Reset the input
    }
  }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleRestoreNewBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const confirmed = await showConfirm(`Are you sure you want to create a new profile from "${file.name}"?`)
    if (!confirmed) {
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
        showAlert(`Successfully created new profile "${profileData.title}" from backup!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create profile')
      }
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      showAlert(`Restore failed: ${errorMessage}`)
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
        setShowCopyToast(true)
        setTimeout(() => setShowCopyToast(false), 2000)
      } else {
        // Fallback for browsers that don't support clipboard API
        showAlert(`Profile URL:\n\n${profileUrl}\n\nPlease copy this link manually.`)
      }
    } catch {
      showAlert(`Profile URL:\n\n${profileUrl}\n\nPlease copy this link manually.`)
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

      // Try to restore with original slug first
      let slugToUse = profileData.slug
      
      // Check if the original slug exists
      if (slugToUse) {
        const existingProfile = profiles.find(p => p.slug === slugToUse)
        if (existingProfile) {
          // Slug exists, so we'll let the server generate a new one
          slugToUse = undefined
        }
      }

      // Add "Restored" to the profile title
      const restoredTitle = `${profileData.title} Restored`

      // Create new profile with restored data using the same code path as new profile creation
      // If slugToUse is undefined, the API will auto-generate a unique slug using crypto.randomUUID().split('-')[0]
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: slugToUse, // Use original slug if available, otherwise let server generate
          title: restoredTitle,
          description: profileData.description,
          cloneFromSlug: 'default', // Will be overridden by gospelData below
          gospelData: profileData.gospelData
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newProfile = data.profile || data
        const newSlug = newProfile.slug

        // Update the newly created profile with the full backup data
        const updateResponse = await fetch(`/api/profiles/${newSlug}`, {
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
          
          const usedOriginalSlug = slugToUse === newSlug
          const message = usedOriginalSlug 
            ? `Successfully created profile "${profileData.title}" from backup!\n\nSlug: ${newSlug} (original slug restored)`
            : `Successfully created profile "${profileData.title}" from backup!\n\nOriginal slug was taken, new slug: ${newSlug}`
          
          showAlert(message)
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
      showAlert(`Restore failed: ${errorMessage}`)
    } finally {
      setIsRestoringNew(false)
      event.target.value = '' // Reset the input
    }
  }

  // Filter profiles based on search query
  // Filter profiles: exclude ALL templates (they only appear in the templates page)
  const filteredProfiles = profiles.filter(profile => {
    // Exclude all template profiles - they only show in the templates page
    if (profile.isTemplate) return false
    
    // Apply counselee/counselor filter
    if (selectedCounselee) {
      // Check if the selected person is in the counseleeEmails array
      const hasCounselee = profile.counseleeEmails?.includes(selectedCounselee)
      if (!hasCounselee) return false
    }
    
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

  // Get unique list of counselees/counselors who have profiles assigned to them
  const counseleesWithProfiles = Array.from(
    new Set(
      profiles
        .filter(p => !p.isTemplate && p.counseleeEmails && p.counseleeEmails.length > 0)
        .flatMap(p => p.counseleeEmails)
    )
  ).sort()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      {/* Toast notification */}
      {showCopyToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white text-green-700 px-4 py-2 rounded-lg shadow-lg border-2 border-green-500 z-50 animate-fade-in">
          URL copied to clipboard
        </div>
      )}
      
      <div className="container mx-auto py-4 sm:py-6">
        <div className="px-3 sm:px-4 lg:px-6">
        <AdminHeader
          title="Dashboard"
          description={
            userRole === 'counselee' 
              ? "View and share gospel presentation resources" 
              : "Manage gospel presentation resource, content, and settings"
          }
          showProfileSwitcher={false}
          actions={
            <div className="flex flex-wrap gap-2">
              {userRole === 'admin' && (
                <>
                  <Link
                    href="/admin/users"
                    className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center justify-center"
                  >
                    <span className="sm:hidden">Users</span>
                    <span className="hidden sm:inline">Manage Users</span>
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center justify-center"
                  >
                    <span className="sm:hidden">Settings</span>
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                </>
              )}
              <Link
                href="/"
                className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center justify-center"
              >
                <span className="sm:hidden">View</span>
                <span className="hidden sm:inline">View Site</span>
              </Link>
              {userRole === 'admin' && (
                <div className="order-3 sm:order-0">
                  <TranslationSettings />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer order-4 sm:order-0 text-sm"
              >
                Logout
              </button>
            </div>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}
        </div>

        <div className="px-3 sm:px-4 lg:px-6">
                  <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold bg-linear-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent">
                    {userRole === 'counselee' ? 'My Resources' : 'Resource Management'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    {userRole === 'counselee' 
                      ? 'View resources shared with you' 
                      : 'Create, edit, and manage resources'}
                  </p>
                </div>
                {/* Hide management buttons for counselees - only show on desktop */}
                {userRole !== 'counselee' && (
                  <div className="hidden md:flex gap-2">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-3 sm:px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <span className="text-sm sm:text-lg">+</span>
                      <span className="hidden sm:inline">Assign Resource</span>
                      <span className="sm:hidden">Assign</span>
                    </button>
                    
                    <Link
                      href="/admin/templates"
                      className="px-3 sm:px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm hover:shadow-md"
                    >
                      <span className="hidden sm:inline">Resource </span>Templates
                    </Link>
                    
                    <label className="px-3 sm:px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm hover:shadow-md">
                      {isRestoringNew ? 'Restoring...' : 'Create from Backup'}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleCreateFromBackup}
                        disabled={isRestoringNew}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
              
              {/* Mobile buttons - show below text on mobile/tablet */}
              {userRole !== 'counselee' && (
                <div className="flex md:hidden gap-2 flex-wrap">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-3 sm:px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <span className="text-sm sm:text-lg">+</span>
                    <span className="hidden sm:inline">Assign Resource</span>
                    <span className="sm:hidden">Assign</span>
                  </button>
                  
                  <Link
                    href="/admin/templates"
                    className="px-3 sm:px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-sm hover:shadow-md"
                  >
                    <span className="hidden sm:inline">Resource </span>Templates
                  </Link>
                  
                  <label className="px-3 sm:px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm hover:shadow-md">
                    {isRestoringNew ? 'Restoring...' : 'Create from Backup'}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleCreateFromBackup}
                      disabled={isRestoringNew}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Search Field */}
            <div className="mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resource by name, URL, description, or owner..."
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Counselee Filter Dropdown */}
                {counseleesWithProfiles.length > 0 && userRole !== 'counselee' && (
                  <select
                    value={selectedCounselee}
                    onChange={(e) => setSelectedCounselee(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-sm text-slate-900 bg-white shadow-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_0.5rem_center] bg-no-repeat pr-10 min-w-[200px]"
                  >
                    <option value="">All Counselees</option>
                    {counseleesWithProfiles.map(email => (
                      <option key={email} value={email}>
                        {email}
                      </option>
                    ))}
                  </select>
                )}
                
                {filteredProfiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    {userRole !== 'counselee' && (
                      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          onClick={() => {
                            if (expandedRows.size === filteredProfiles.length) {
                              setExpandedRows(new Set())
                            } else {
                              const allIds = filteredProfiles.map(p => p.id)
                              setExpandedRows(new Set(allIds))
                            }
                          }}
                          className="px-2 sm:px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-all inline-flex items-center gap-1.5 bg-white text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                          title={expandedRows.size > 0 ? 'Collapse all details' : 'Expand all details'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {expandedRows.size > 0 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            )}
                          </svg>
                          <span className="hidden sm:inline">{expandedRows.size > 0 ? 'Collapse' : 'Expand'}</span>
                        </button>
                      </div>
                    )}
                    <ViewToggle view={view} onViewChange={setView} />
                  </div>
                )}
              </div>
              {(searchQuery || selectedCounselee) && (
                <p className="text-xs text-slate-500 mt-2">
                  Found {filteredProfiles.length} of {profiles.filter(p => !p.isTemplate).length} profile{filteredProfiles.length !== 1 ? 's' : ''}
                  {selectedCounselee && ` for ${selectedCounselee}`}
                </p>
              )}
            </div>

          {showCreateForm && (
            <div className="mb-6 border border-slate-200 rounded-xl p-4 sm:p-6 bg-linear-to-br from-white to-slate-50 shadow-md">
              <h3 className="text-base sm:text-lg font-semibold bg-linear-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent mb-4">Create New Assingment</h3>
              
              <form onSubmit={handleCreateProfile} className="space-y-4">
                {/* Clone From Field - FIRST */}
                <div>
                  <label htmlFor="cloneFrom" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Clone From *
                  </label>
                  <select
                    id="cloneFrom"
                    value={createForm.cloneFromSlug}
                    onChange={(e) => handleCloneFromChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_0.5rem_center] bg-no-repeat pr-10"
                  >
                    <option value="">Pick a resource template to clone from</option>
                    {profiles.filter(p => {
                      if (userRole === 'admin') {
                        return p.isTemplate || !p.isTemplate
                      }
                      return p.isTemplate || p.createdBy === user?.id
                    }).sort((a, b) => (a.description || '').localeCompare(b.description || '')).map(profile => (
                      <option key={profile.slug} value={profile.slug}>
                        {profile.title} ({profile.slug})
                        {profile.isTemplate ? ' - Template' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {userRole === 'admin' 
                      ? 'Clone from any template'
                      : 'Clone from templates or your own resource'}
                  </p>
                </div>

                {/* Counselee Email Invites - SECOND */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">
                    Invite Counselees (Optional)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Add email addresses of people you want to give view-only access to this profile
                  </p>
                  
                  <div className="flex gap-2 flex-col">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        disabled={!createForm.cloneFromSlug}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const user = availableUsers.find(u => u.email === e.target.value)
                            setCounseleeEmailInput(e.target.value)
                            setUsernameInput(user?.username || '')
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 bg-white text-slate-900 shadow-sm transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-size-[1.25rem] bg-position-[right_0.5rem_center] bg-no-repeat pr-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={!createForm.cloneFromSlug}
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCounseleeEmail()
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Or type email address..."
                      />
                    </div>

                    {/* Username Field - Always show */}
                    <input
                      type="text"
                      disabled={!createForm.cloneFromSlug}
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Username *"
                      className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    <button
                      type="button"
                      onClick={handleAddCounseleeEmail}
                      disabled={!createForm.cloneFromSlug || !counseleeEmailInput.trim() || !counseleeEmailInput.includes('@') || !usernameInput.trim()}
                      className="bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 px-4 py-2 rounded-lg border border-green-200 hover:border-green-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  
                  {createForm.counseleeEmails.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                      {createForm.counseleeEmails.map(email => {
                        const user = availableUsers.find(u => u.email === email)
                        const displayName = user?.username || email
                        return (
                          <div key={email} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                            <span className="text-sm text-slate-700">{displayName}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCounseleeEmail(email)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Profile Title - THIRD */}
                <div>
                  <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    disabled={!createForm.cloneFromSlug}
                    value={createForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Title will get auto generated"
                    required
                    maxLength={50}
                  />
                </div>

                {/* Profile Description - FOURTH */}
                <div>
                  <label htmlFor="description" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    disabled={!createForm.cloneFromSlug}
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-900 bg-white shadow-sm text-sm transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Description will get auto generated"
                    rows={3}
                    maxLength={200}
                    required
                  />
                </div>

                {userRole === 'admin' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isTemplate"
                      disabled={!createForm.cloneFromSlug}
                      checked={createForm.isTemplate}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, isTemplate: e.target.checked }))}
                      className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="isTemplate" className="text-xs sm:text-sm font-medium text-slate-700">
                      Make this a resource template (editable only by admins, visible to all users)
                    </label>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    type="submit"
                    disabled={isCreating || !createForm.cloneFromSlug || !createForm.title.trim() || !createForm.description.trim()}
                    className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    {isCreating ? 'Creating...' : 'Create Assignment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setCreateForm({ 
                        title: '', 
                        description: '', 
                        cloneFromSlug: '', 
                        isTemplate: false,
                        counseleeEmails: []
                      })
                      setCounseleeEmailInput('')
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
          ) : view === 'card' ? (
            // Card View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProfiles.map(profile => {
                const canManageProfile = userRole !== 'counselee' && (userRole === 'admin' || (profile.createdBy === user?.id && !profile.isDefault && !profile.isTemplate))
                return (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    siteUrl={siteUrl}
                    onCopyUrl={handleCopyProfileUrl}
                    onDelete={handleDeleteProfile}
                    canManage={canManageProfile}
                    userRole={userRole}
                    showDetails={userRole !== 'counselee' ? expandedRows.has(profile.id) : undefined}
                    onToggleDetails={userRole !== 'counselee' ? () => {
                      const newExpandedRows = new Set(expandedRows)
                      if (expandedRows.has(profile.id)) {
                        newExpandedRows.delete(profile.id)
                      } else {
                        newExpandedRows.add(profile.id)
                      }
                      setExpandedRows(newExpandedRows)
                    } : undefined}
                  />
                )
              })}
            </div>
          ) : (
            // List View
            <div className="divide-y divide-slate-200">
              {filteredProfiles.map(profile => {
                const isExpanded = expandedRows.has(profile.id)
                const toggleExpanded = () => {
                  const newExpandedRows = new Set(expandedRows)
                  if (isExpanded) {
                    newExpandedRows.delete(profile.id)
                  } else {
                    newExpandedRows.add(profile.id)
                  }
                  setExpandedRows(newExpandedRows)
                }
                
                const canManageProfile = userRole !== 'counselee' && (userRole === 'admin' || (profile.createdBy === user?.id && !profile.isDefault && !profile.isTemplate))
                const canShare = userRole !== 'counselee' && (userRole === 'admin' || profile.createdBy === user?.id)
                const canDelete = !profile.isDefault && userRole !== 'counselee' && (userRole === 'admin' || (profile.createdBy === user?.id && !profile.isTemplate))
                
                return (
                  <div key={profile.id} className="py-4">
                    {/* Collapsed View - Always Shown */}
                    <div className="relative group">
                      <Link
                        href={`/${profile.slug}`}
                        target="_blank"
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 -m-4 rounded-lg transition-colors hover:bg-slate-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                              <h3 className="text-base sm:text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {profile.title}
                              </h3>
                              {profile.isTemplate && (
                                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                                  Template
                                </span>
                              )}
                              {profile.isDefault && (
                                <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium w-fit">
                                  Default
                                </span>
                              )}
                            </div>
                            
                            {/* Description */}
                            {profile.description && (
                              <p className="text-xs sm:text-sm text-slate-600">
                                {profile.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right side - Details toggle */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Details toggle button for counselors/admins only */}
                          {canManageProfile && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                toggleExpanded()
                              }}
                              className="relative z-10 text-slate-700 hover:text-slate-800 text-xs sm:text-sm font-medium bg-blue-50 hover:bg-blue-100 px-2 sm:px-3 py-1 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              {isExpanded ? '▼ Details' : '▶ Details'}
                            </button>
                          )}
                        </div>
                      </Link>
                    </div>

                    {/* Expanded Details - Only shown for counselors/admins */}
                    {isExpanded && canManageProfile && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                        {/* Details/Info */}
                        <div className="space-y-2 text-xs sm:text-sm">
                          {/* Badges */}
                          {(profile.isDefault || profile.isTemplate) && (
                            <div className="flex flex-wrap gap-1.5 pb-2">
                              {profile.isDefault && (
                                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">
                                  Default
                                </span>
                              )}
                              {profile.isTemplate && (
                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                                  Template
                                </span>
                              )}
                            </div>
                          )}

                          {canManageProfile && (
                            <p className="text-slate-600">
                              <span className="font-medium">URL:</span> <span className="break-all">{siteUrl}/{profile.slug}</span>
                            </p>
                          )}
                          
                          {profile.ownerUsername && (
                            <p className="text-slate-600">
                              <span className="font-medium">Owner:</span> {profile.ownerUsername}
                            </p>
                          )}

                          {canManageProfile && profile.usernames && profile.usernames.length > 0 && (
                            <p className="text-slate-600">
                              <span className="font-medium">Counselees:</span>{' '}
                              {profile.usernames.join(', ')}
                            </p>
                          )}

                          {profile.visitCount !== undefined && (
                            <p className="text-slate-600">
                              <span className="font-medium">Views:</span> {profile.visitCount}
                            </p>
                          )}
                          
                          {profile.updatedAt && (
                            <p className="text-slate-600">
                              <span className="font-medium">Updated:</span> {new Date(profile.updatedAt).toLocaleDateString()}
                            </p>
                          )}

                          {canManageProfile && (
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-500 pt-1">
                              <span className="hidden sm:inline">Created {new Date(profile.createdAt).toLocaleDateString()}</span>
                              {profile.lastVisited ? (
                                <span>Last visited {new Date(profile.lastVisited).toLocaleDateString()}</span>
                              ) : profile.visitCount === 0 ? (
                                <span className="text-orange-500">Never visited</span>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons - Only for managers */}
                        {canManageProfile && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {canShare && (
                                <button
                                  onClick={() => handleCopyProfileUrl(profile)}
                                  className="text-slate-700 hover:text-slate-800 text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 px-2 sm:px-3 py-1 rounded-lg border border-slate-300 hover:border-slate-400 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  Copy URL
                                </button>
                              )}
                            
                            <Link
                              href={`/admin/profiles/${profile.slug}`}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-300"
                            >
                              Settings
                            </Link>
                            
                            <Link
                              href={`/admin/profiles/${profile.slug}/content`}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm transition-all duration-200 font-medium shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-300"
                            >
                              Edit
                            </Link>
                            
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteProfile(profile.slug, profile.title)}
                                className="text-red-700 hover:text-red-800 text-xs sm:text-sm font-medium bg-red-50 hover:bg-red-100 px-2 sm:px-3 py-1 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

export { AdminPageContent }

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <AdminPageContent />
    </AdminErrorBoundary>
  )
}
