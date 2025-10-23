'use client'

import { useState, useEffect } from 'react'
import GospelSection from '@/components/GospelSection'
import ScriptureModal from '@/components/ScriptureModal'
import TableOfContents from '@/components/TableOfContents'
import { GospelSection as GospelSectionType } from '@/lib/types'

interface ProfileInfo {
  title: string
  description?: string
  slug: string
  favoriteScriptures: string[]
}

interface ProfileContentProps {
  sections: GospelSectionType[]
  profileInfo: ProfileInfo
}

export default function ProfileContent({ sections, profileInfo }: ProfileContentProps) {
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
    console.log('📖 Found', favorites.length, 'favorite scripture references:', favorites)
  }

  // Load favorite references when sections change
  useEffect(() => {
    collectFavoriteReferences(sections)
  }, [sections])

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
          sectionTitle: `${section.section}. ${section.title}`,
          subsectionTitle: subsection.title,
          content: subsection.content
        }
      })),
      ...(subsection.nestedSubsections?.flatMap(nested => 
        (nested.scriptureReferences || []).map(ref => ({
          reference: ref.reference,
          context: {
            sectionTitle: `${section.section}. ${section.title}`,
            subsectionTitle: `${subsection.title} - ${nested.title}`,
            content: nested.content
          }
        }))
      ) || [])
    ])
  )

  const handleScriptureClick = (reference: string) => {
    // Find the context for this reference
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    
    // Update current reference index if this is a favorite
    const favoriteIndex = favoriteReferences.indexOf(reference)
    if (favoriteIndex !== -1) {
      setCurrentReferenceIndex(favoriteIndex)
    }
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  // Navigation functions for favorite references only
  const navigateToPrevious = () => {
    if (favoriteReferences.length === 0) return
    
    const newIndex = (currentReferenceIndex - 1 + favoriteReferences.length) % favoriteReferences.length
    setCurrentReferenceIndex(newIndex)
    const reference = favoriteReferences[newIndex]
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  const navigateToNext = () => {
    if (favoriteReferences.length === 0) return
    
    const newIndex = (currentReferenceIndex + 1) % favoriteReferences.length
    setCurrentReferenceIndex(newIndex)
    const reference = favoriteReferences[newIndex]
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  // Navigation state for favorites only
  const hasPrevious = favoriteReferences.length > 1
  const hasNext = favoriteReferences.length > 1

  const closeModal = () => {
    setSelectedScripture({ reference: '', isOpen: false })
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Hamburger Menu Button */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="container mx-auto px-5 py-3">
          <div className="flex justify-between items-center">
            <button
              onClick={toggleMenu}
              className="flex items-center gap-3 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
            >
              <div className="flex flex-col gap-1">
                <div className={`w-5 h-0.5 bg-white transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`w-5 h-0.5 bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`w-5 h-0.5 bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
              <span className="font-medium">Table of Contents</span>
            </button>
            
            {/* Profile Info - Subtle indicator */}
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">{profileInfo?.title || 'Gospel Profile'}</div>
              {profileInfo?.description && (
                <div className="text-xs text-slate-500">{profileInfo.description}</div>
              )}
              {profileInfo?.favoriteScriptures && profileInfo.favoriteScriptures.length > 0 && (
                <div className="text-xs text-blue-600">
                  📖 {profileInfo.favoriteScriptures.length} favorite{profileInfo.favoriteScriptures.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Invisible click area to close menu */}
          <div className="fixed inset-0 z-40" onClick={closeMenu}></div>
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 z-50 bg-white w-64 h-full shadow-2xl overflow-y-auto border-r border-gray-200 transform transition-transform duration-300 ease-in-out">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-700">
                  Table of Contents
                </h3>
                <button
                  onClick={closeMenu}
                  className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div onClick={closeMenu}>
                <TableOfContents sections={sections} />
              </div>
            </div>
          </div>
        </>
      )}

      <main className="container mx-auto px-5 py-10">
        <div className="space-y-12">
          {sections.map((section) => (
            <GospelSection 
              key={section.section} 
              section={section}
              onScriptureClick={handleScriptureClick}
            />
          ))}
        </div>
      </main>

      <footer className="bg-slate-700 text-white text-center py-8 mt-16">
        <div className="container mx-auto px-5">
          <p className="mb-4">
            You may download the PowerPoint presentation of this appendix on{' '}
            <a 
              href="http://www.oneeightycounseling.com" 
              target="_blank" 
              rel="noopener"
              className="text-blue-300 hover:text-blue-200 underline"
            >
              www.oneeightycounseling.com
            </a>
          </p>
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
        context={selectedScripture.context}
      />
    </>
  )
}