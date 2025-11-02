'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import GospelSection from '@/components/GospelSection'
import ScriptureModal from '@/components/ScriptureModal'
import TableOfContents from '@/components/TableOfContents'
import { GospelSection as GospelSectionType, GospelProfile, SavedAnswer } from '@/lib/types'
import { useScriptureProgress } from '@/lib/useScriptureProgress'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'

interface ProfileInfo {
  title: string
  description?: string
  slug: string
  favoriteScriptures: string[]
  savedAnswers?: SavedAnswer[]
}

interface ProfileContentProps {
  sections: GospelSectionType[]
  profileInfo: ProfileInfo
  profile?: GospelProfile | null  // Full profile for scripture progress tracking
}

export default function ProfileContent({ sections, profileInfo, profile }: ProfileContentProps) {
  const router = useRouter()
  const [selectedScripture, setSelectedScripture] = useState<{
    reference: string
    isOpen: boolean
    context?: {
      sectionTitle: string
      subsectionTitle: string
      content: string
    }
  }>({ reference: '', isOpen: false })
  
  const [favoriteReferences, setFavoriteReferences] = useState<string[]>([])
  const [currentReferenceIndex, setCurrentReferenceIndex] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [fromEditor, setFromEditor] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Check authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserEmail(user.email || null)
        
        // Check user role
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single<{ role: 'admin' | 'counselor' | 'counselee' }>()
        
        if (userProfile && (userProfile.role === 'admin' || userProfile.role === 'counselor')) {
          setCanEdit(true)
        }
      }
    }
    checkAuth()
    
    // Check if coming from editor via URL parameter
    const params = new URLSearchParams(window.location.search)
    setFromEditor(params.get('preview') === 'true')
  }, [])

  // Scripture progress tracking
  const { 
    trackScriptureView, 
    resetProgress, 
    lastViewedScripture, 
    isLoading: progressLoading,
    error: progressError 
  } = useScriptureProgress(profile || null)
  
  // Local state to track the current progress for immediate UI updates
  const [localLastViewed, setLocalLastViewed] = useState<string | null>(null)
  
  // Update local state when profile changes or lastViewedScripture changes
  useEffect(() => {
    setLocalLastViewed(lastViewedScripture?.reference || null)
  }, [lastViewedScripture])
  
  // Current last viewed scripture (use local state for immediate updates)
  const currentLastViewed = localLastViewed || lastViewedScripture?.reference
  
  // Wrapper function to reset progress and update local state immediately
  const handleClearProgress = useCallback(async () => {
    await resetProgress()
    setLocalLastViewed(null)
    // Refresh the page data to get updated profile from server
    router.refresh()
  }, [resetProgress, router])

  // Early return if required props are missing
  if (!sections || !profileInfo) {
    return <div>Loading...</div>
  }

  // Collect favorite references from gospel data
  const collectFavoriteReferences = (data: GospelSectionType[]) => {
    const favorites: string[] = []
    
    data.forEach(section => {
      section.subsections.forEach(subsection => {
        // Check main subsection scripture references
        if (subsection.scriptureReferences) {
          subsection.scriptureReferences.forEach(ref => {
            if (ref.favorite) {
              favorites.push(ref.reference)
            }
          })
        }
        
        // Check nested subsections
        if (subsection.nestedSubsections) {
          subsection.nestedSubsections.forEach(nested => {
            if (nested.scriptureReferences) {
              nested.scriptureReferences.forEach(ref => {
                if (ref.favorite) {
                  favorites.push(ref.reference)
                }
              })
            }
          })
        }
      })
    })
    
    setFavoriteReferences(favorites)
    logger.debug('📖 Found', favorites.length, 'favorite scripture references:', favorites)
  }

  // Load favorite references when sections change
  useEffect(() => {
    collectFavoriteReferences(sections)
  }, [sections])

  // Track visit count when profile is viewed
  useEffect(() => {
    const trackVisit = async () => {
      try {
        await fetch(`/api/profiles/${profileInfo.slug}/visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        // Don't break the page if visit tracking fails
        console.warn('Visit tracking failed:', error)
      }
    }

    // Only track visits for actual profile slugs (not admin pages)
    if (profileInfo.slug && profileInfo.slug !== 'admin') {
      trackVisit()
    }
  }, [profileInfo.slug])

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedScripture.isOpen) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          navigateToPrevious()
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          navigateToNext()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedScripture.isOpen, favoriteReferences, currentReferenceIndex])

  // Collect all scripture references with context in order
  const allScriptureRefs = sections.flatMap(section => 
    section.subsections.flatMap(subsection => [
      ...(subsection.scriptureReferences || []).map(ref => ({
        reference: ref.reference,
        context: {
          sectionTitle: section.title,
          subsectionTitle: subsection.title,
          content: subsection.content
        }
      })),
      ...(subsection.nestedSubsections?.flatMap(nested => 
        (nested.scriptureReferences || []).map(ref => ({
          reference: ref.reference,
          context: {
            sectionTitle: section.title,
            subsectionTitle: `${subsection.title} - ${nested.title}`,
            content: nested.content
          }
        }))
      ) || [])
    ])
  )

  const handleScriptureClick = async (reference: string) => {
    // Find the context for this reference
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    
    // Track scripture progress for non-default profiles
    if (profile && !profile.isDefault) {
      try {
        // Find section and subsection IDs for tracking
        let sectionId = ''
        let subsectionId = ''
        
        for (const section of sections) {
          for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
            const subsection = section.subsections[subIndex]
            
            // Check main subsection references
            if (subsection.scriptureReferences?.some(ref => ref.reference === reference)) {
              sectionId = `section-${section.section}`
              subsectionId = `${sectionId}-${subIndex}`
              break
            }
            
            // Check nested subsection references
            if (subsection.nestedSubsections) {
              for (const nested of subsection.nestedSubsections) {
                if (nested.scriptureReferences?.some(ref => ref.reference === reference)) {
                  sectionId = `section-${section.section}`
                  subsectionId = `${sectionId}-${subIndex}`
                  break
                }
              }
            }
          }
          if (sectionId) break
        }
        
        if (sectionId && subsectionId) {
          await trackScriptureView(reference, sectionId, subsectionId)
          // Immediately update local state for visual feedback
          setLocalLastViewed(reference)
        }
      } catch (error) {
        console.warn('Failed to track scripture progress:', error)
        // Don't break the user experience
      }
    }
    
    // Update current reference index based on navigation array
    const navigationRefs = favoriteReferences.length > 0 ? favoriteReferences : allScriptureRefs.map(ref => ref.reference)
    const navIndex = navigationRefs.indexOf(reference)
    if (navIndex !== -1) {
      setCurrentReferenceIndex(navIndex)
    }
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  // Determine navigation array: use favorites if available, otherwise use all references
  const navigationRefs = favoriteReferences.length > 0 ? favoriteReferences : allScriptureRefs.map(ref => ref.reference)
  
  // Navigation functions for favorite references or all references if no favorites
  const navigateToPrevious = () => {
    if (navigationRefs.length === 0) return
    
    const newIndex = (currentReferenceIndex - 1 + navigationRefs.length) % navigationRefs.length
    setCurrentReferenceIndex(newIndex)
    const reference = navigationRefs[newIndex]
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    
    // Track the new scripture being viewed
    handleModalScriptureViewed(reference)
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  const navigateToNext = () => {
    if (navigationRefs.length === 0) return
    
    const newIndex = (currentReferenceIndex + 1) % navigationRefs.length
    setCurrentReferenceIndex(newIndex)
    const reference = navigationRefs[newIndex]
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    
    // Track the new scripture being viewed
    handleModalScriptureViewed(reference)
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  // Navigation state: enabled if more than one reference available
  const hasPrevious = navigationRefs.length > 1
  const hasNext = navigationRefs.length > 1

  const closeModal = () => {
    setSelectedScripture({ reference: '', isOpen: false })
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  // Simplified scripture tracking for modal (doesn't need section/subsection IDs)
  const handleModalScriptureViewed = async (reference: string) => {
    if (profile && !profile.isDefault) {
      try {
        // For modal views, use generic section/subsection IDs
        await trackScriptureView(reference, 'modal-view', 'modal-view')
        // Immediately update local state for visual feedback
        setLocalLastViewed(reference)
      } catch (error) {
        console.warn('Failed to track scripture progress from modal:', error)
        // Don't break the user experience
      }
    }
  }

  return (
    <>
      {/* Print-only header - appears at top of first page */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 className="print-title">The Gospel Presentation</h1>
      </div>

      {/* Unified Layout - Hamburger menu at all screen sizes */}
      <div className="min-h-screen flex-col">
        {/* Header with hamburger menu and optional edit button */}
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-sm shadow-md print-hide">
          <div className="w-full px-5 py-3">
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={toggleMenu}
                className="flex items-center gap-3 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className={`w-5 h-0.5 bg-white transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                  <div className={`w-5 h-0.5 bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                  <div className={`w-5 h-0.5 bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
                <span className="font-medium">Menu</span>
              </button>
              
              {/* Right side content */}
              <div className="flex items-center gap-3">
                {/* Logged in indicator - clickable to logout with confirmation */}
                {userEmail && (
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to log out?')) {
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        router.push('/default')
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors cursor-pointer"
                    title="Click to log out"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-700 font-medium hidden sm:inline">
                      {userEmail}
                    </span>
                    <span className="text-xs text-green-700 font-medium sm:hidden">
                      Logged in
                    </span>
                  </button>
                )}
                
                {/* Profile Info and Edit Button - only show when previewing from editor */}
                {canEdit && fromEditor && (
                  <>
                    {/* Profile Info */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700">{profileInfo?.title || 'Gospel Profile'}</div>
                      {profileInfo?.favoriteScriptures && profileInfo.favoriteScriptures.length > 0 && (
                        <div className="text-xs text-blue-600">
                          📖 {profileInfo.favoriteScriptures.length} favorite{profileInfo.favoriteScriptures.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    
                    {/* Edit Button for authenticated users - top right */}
                    <Link
                      href={`/admin/profiles/${profileInfo.slug}/content`}
                      className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap"
                    >
                      ✏️ Edit
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Hover trigger area on left edge */}
        <div 
          className="hidden lg:block fixed left-0 top-0 h-full w-12 z-30 print-hide"
          onMouseEnter={() => setIsMenuOpen(true)}
        />

        {/* Main Content Area */}
        <div className="bg-gray-50">
          <main className="container mx-auto px-5 py-10">
            <div className="space-y-12">
              {sections.map((section) => (
                <div key={section.section} className="print-section">
                  <GospelSection 
                    section={section}
                    onScriptureClick={handleScriptureClick}
                    lastViewedScripture={currentLastViewed}
                    onClearProgress={handleClearProgress}
                    profileSlug={profileInfo.slug}
                    savedAnswers={profileInfo.savedAnswers}
                  />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Collapsible Menu Overlay - Mobile: click, Desktop: hover */}
      {isMenuOpen && (
        <>
          {/* Invisible click area to close menu on mobile */}
          <div className="lg:hidden fixed inset-0 z-40 print-hide" onClick={closeMenu}></div>
          
          {/* Menu Panel */}
          <div 
            className="fixed top-0 left-0 z-50 bg-white w-80 h-full shadow-2xl overflow-y-auto border-r border-gray-200 transform transition-transform duration-300 ease-in-out print-hide"
            onMouseLeave={() => {
              // Only auto-close on desktop when mouse leaves
              if (window.innerWidth >= 1024) {
                closeMenu()
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-slate-700">
                  Table of Contents
                </h3>
                <button
                  onClick={closeMenu}
                  className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <TableOfContents sections={sections} currentProfileSlug={profileInfo.slug} />
              
              {/* Profile Info in Sidebar */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm font-medium text-slate-700 mb-2">{profileInfo?.title || 'Gospel Profile'}</div>
                {profileInfo?.description && (
                  <div className="text-xs text-slate-500 mb-2">{profileInfo.description}</div>
                )}
                {profileInfo?.favoriteScriptures && profileInfo.favoriteScriptures.length > 0 && (
                  <div className="text-xs text-blue-600 mb-2">
                    📖 {profileInfo.favoriteScriptures.length} favorite{profileInfo.favoriteScriptures.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Scripture Progress Section */}
                {profile && !profile.isDefault && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {currentLastViewed ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-600">Reading Progress</div>
                      <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded border">
                        📍 Last: {currentLastViewed}
                      </div>
                      <button
                        onClick={async () => {
                          await resetProgress()
                          setLocalLastViewed(null)
                          router.refresh()
                        }}
                        disabled={progressLoading}
                        className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors disabled:opacity-50 w-full"
                      >
                        {progressLoading ? 'Resetting...' : 'Reset Progress'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Click any scripture to start tracking your progress
                    </div>
                  )}
                  
                  {progressError && (
                    <div className="text-xs text-red-600 mt-2">
                      Error: {progressError}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Footer */}
      <footer className="bg-slate-700 text-white text-center py-8 mt-16 print-hide">
        <div className="container mx-auto px-5">
          <p className="text-sm opacity-80 mb-2">
            Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.
          </p>
          <p className="text-sm opacity-80">
            <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline mr-4">
              www.esv.org
            </a>
            <a href="/copyright" className="text-blue-400 hover:text-blue-300 underline">
              Copyright & Attribution
            </a>
          </p>
        </div>
      </footer>

      {/* Scripture Modal */}
      <ScriptureModal 
        reference={selectedScripture.reference}
        isOpen={selectedScripture.isOpen}
        onClose={closeModal}
        onPrevious={hasPrevious ? navigateToPrevious : undefined}
        onNext={hasNext ? navigateToNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        currentIndex={currentReferenceIndex}
        totalFavorites={favoriteReferences.length}
        totalReferences={navigationRefs.length}
        context={selectedScripture.context}
        onScriptureViewed={handleModalScriptureViewed}
      />
    </>
  )
}