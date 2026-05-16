'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { TemplatesListPanel } from '@/app/admin/templates/TemplatesListPanel'
import AdminErrorBoundary from '@/components/AdminErrorBoundary'
import TranslationSettings from '@/components/TranslationSettings'
import ViewToggle from '@/components/ViewToggle'
import ProfileCard from '@/components/ProfileCard'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { shareResourceUrl } from '@/lib/shareResourceUrl'
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
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  const [error, setError] = useState('')
  const [siteUrl, setSiteUrl] = useState('yoursite.com')
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useViewPreference('list')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showCopyToast, setShowCopyToast] = useState(false)
  const { showAlert } = useAlertModal()

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
    
    const role = ((userProfile as any)?.role || 'counselor') as 'admin' | 'counselor' | 'counselee'
    setUserRole(role)
    setIsLoading(false)
    // Assigned-resource list lives only for counselees; admins/counselors use templates + per-profile routes.
    if (role === 'counselee') {
      fetchProfiles()
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
      setProfilesLoading(true)
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
      setProfilesLoading(false)
    }
  }

  const noopDeleteProfile: (slug: string, title: string) => Promise<void> = async () => {}

  const handleCopyProfileUrl = async (profile: any) => {
    const profileUrl = `${siteUrl}/${profile.slug}`
    try {
      const result = await shareResourceUrl({
        url: profileUrl,
        title: profile.title || profile.slug,
        dialogTitle: 'Share profile link',
        text: `Open this presentation: ${profile.title || profile.slug}`,
      })
      if (result === 'copied') {
        setShowCopyToast(true)
        setTimeout(() => setShowCopyToast(false), 2000)
      }
    } catch {
      showAlert(`Profile URL:\n\n${profileUrl}\n\nPlease copy this link manually.`)
    }
  }

  // Filter profiles based on search query
  // Filter profiles: exclude ALL templates (they only appear in the templates page)
  const filteredProfiles = profiles.filter((profile) => {
    if (profile.isTemplate) return false
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
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
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
              {(userRole === 'admin' || userRole === 'counselor') && (
                <Link
                  href="/admin/settings"
                  className="px-3 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm inline-flex items-center justify-center"
                >
                  Settings
                </Link>
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
          {userRole !== 'counselee' && (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
              <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold bg-linear-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent">
                    Resource templates
                  </h2>
                </div>
              </div>
              {(userRole === 'admin' || userRole === 'counselor') && (
                <TemplatesListPanel authReady={Boolean(user)} userRole={userRole} embedded />
              )}
            </div>
          )}

          {userRole === 'counselee' && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 border border-slate-100">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold bg-linear-to-br from-slate-700 to-slate-800 bg-clip-text text-transparent">
                  My Resources
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  View resources shared with you
                </p>
              </div>
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

                {filteredProfiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <ViewToggle view={view} onViewChange={setView} />
                  </div>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-slate-500 mt-2">
                  Found {filteredProfiles.length} of {profiles.filter(p => !p.isTemplate).length} profile{filteredProfiles.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>


          {profilesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading profiles...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-slate-400 text-3xl sm:text-4xl mb-4" aria-hidden>
                ·
              </div>
              <p className="text-slate-600 mb-4 text-sm sm:text-base">
                {searchQuery ? 'No profiles match your search' : 'No profiles found'}
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                {searchQuery ? 'Try a different search term' : 'When your counselor shares a resource with you, it will appear here.'}
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
                    onDelete={noopDeleteProfile}
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
                                onClick={() => noopDeleteProfile(profile.slug, profile.title)}
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
          )}
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
