'use client'

import { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import GospelSection from '@/components/GospelSection'
import ScriptureModal from '@/components/ScriptureModal'
import MemorizationPracticeSession from '@/components/MemorizationPracticeSession'
import TableOfContents from '@/components/TableOfContents'
import SpurgeonSermonsModal from '@/components/SpurgeonSermonsModal'
import SidebarAuthNav from '@/components/SidebarAuthNav'
import MenuLocalDataBackup from '@/components/MenuLocalDataBackup'
import ThemeToggle from '@/components/ThemeToggle'
import BookmarksDropdown from '@/components/BookmarksDropdown'
import HighlightsDropdown from '@/components/HighlightsDropdown'
import ProfileHelpMenu from '@/components/ProfileHelpMenu'
import PresentationFirstVisitWelcome from '@/components/PresentationFirstVisitWelcome'
import { ScriptureFooterAttributionParagraphs } from '@/components/ScriptureFooterAttributionParagraphs'
import { GospelSection as GospelSectionType, GospelProfile, SavedAnswer } from '@/lib/types'
import type { VersePinAnchoredEntry, VersePinColorId, VersePinsStoredState, VersePinSlotEntry } from '@/lib/versePinStorage'
import {
  assignVersePin,
  assignYellowLastViewed,
  availablePinColorsForModalChoice,
  clearAllVersePins,
  createEmptyVersePinsState,
  loadVersePins,
  removeVersePin,
  shouldAdvanceYellowLastViewed,
  versePinColorForPassage,
  versePinsListFromState,
} from '@/lib/versePinStorage'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/client'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useTranslation } from '@/contexts/TranslationContext'
import { GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { scrollToTocAnchor } from '@/lib/scrollToTocAnchor'
import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import {
  plainTextForProfileHighlightUi,
  visibleTextLengthBeforeBoundary,
} from '@/lib/profileHighlightVisibleText'
import {
  addHighlight,
  highlightsForSlug,
  removeHighlight,
  type ProfileHighlight,
} from '@/lib/profileHighlightsStorage'
import {
  clearMemorizationInProgress,
  loadMemorizedVerses,
  saveMemorizationInProgress,
  updatePracticeStats,
  type MemorizedVerse,
} from '@/lib/verseMemorizationStorage'

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

/** One scripture card in profile order (for modal prev/next without collapsing duplicate references). */
interface ScriptureRefNav {
  reference: string
  sectionId: string
  subsectionId: string
}

function closestElement(node: Node | null, selector: string): HTMLElement | null {
  if (!node) return null
  const base = node instanceof Element ? node : node.parentElement
  if (!base) return null
  const found = base.closest(selector)
  return found instanceof HTMLElement ? found : null
}

function isInsideHighlightIgnoredMount(node: Node | null): boolean {
  return !!closestElement(node, '[data-gospel-mount]')
}

function textOffsetWithinScope(scopeEl: HTMLElement, node: Node, nodeOffset: number): number {
  return visibleTextLengthBeforeBoundary(scopeEl, node, nodeOffset)
}

function ProfileContent({ sections, profileInfo }: ProfileContentProps) {
  const [selectedScripture, setSelectedScripture] = useState<{
    reference: string
    isOpen: boolean
  }>({ reference: '', isOpen: false })
  
  const [favoriteReferences, setFavoriteReferences] = useState<string[]>([])
  const [currentReferenceIndex, setCurrentReferenceIndex] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSpurgeonLibraryOpen, setIsSpurgeonLibraryOpen] = useState(false)
  /** When opening Spurgeon from the scripture modal “Study”, pre-fill and search by this reference. */
  const [spurgeonStudyReference, setSpurgeonStudyReference] = useState<string | null>(null)
  /** Skip desktop `onMouseLeave` close while the restore JSON file picker is open (keeps `<input type="file">` mounted). */
  const deferCloseMenuForFilePickerRef = useRef(false)
  const [memorizationPracticeVerse, setMemorizationPracticeVerse] = useState<MemorizedVerse | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [fromEditor, setFromEditor] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [profileHighlights, setProfileHighlights] = useState<ProfileHighlight[]>([])
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null)
  const activeHighlightTimerRef = useRef<number | null>(null)
  const { showConfirm } = useAlertModal()
  const { enabledTranslations, isLoading: translationsLoading } = useTranslation()
  const footerAttributionEnabledCodes = translationsLoading ? null : enabledTranslations

  // Set hydrated flag immediately on client to avoid hydration mismatch
  useLayoutEffect(() => {
    setIsHydrated(true)
  }, [])

  // Check authentication and role
  useEffect(() => {
    if (!isHydrated) return // Skip until hydrated

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
  }, [isHydrated])

  const sectionCount = sections?.length ?? 0
  const refreshHighlights = useCallback(() => {
    if (!profileInfo?.slug) {
      setProfileHighlights([])
      return
    }
    setProfileHighlights(highlightsForSlug(profileInfo.slug))
  }, [profileInfo?.slug])

  const highlightsByScopeId = useMemo(() => {
    const out: Record<string, Array<{ id: string; startOffset: number; endOffset: number }>> = {}
    profileHighlights.forEach((h) => {
      if (!out[h.scopeId]) out[h.scopeId] = []
      out[h.scopeId]!.push({ id: h.id, startOffset: h.startOffset, endOffset: h.endOffset })
    })
    return out
  }, [profileHighlights])

  // Deep-link / bookmark: scroll to #section-* when hash is present after paint
  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileInfo?.slug) return

    const scrollIfHash = () => {
      const raw = window.location.hash.slice(1)
      if (!raw || !raw.startsWith('section-')) return
      scrollToTocAnchor(decodeURIComponent(raw), { behavior: 'auto' })
    }

    const timer = window.setTimeout(scrollIfHash, 0)
    window.addEventListener('hashchange', scrollIfHash)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('hashchange', scrollIfHash)
    }
  }, [isHydrated, sectionCount, profileInfo?.slug])

  useEffect(() => {
    if (!isHydrated || !profileInfo?.slug) return

    const handleSelectionEnd = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return

      const range = sel.getRangeAt(0)
      if (!range || range.collapsed) return
      if (isInsideHighlightIgnoredMount(range.startContainer) || isInsideHighlightIgnoredMount(range.endContainer)) {
        return
      }

      const startScope = closestElement(range.startContainer, '[data-highlight-scope]')
      const endScope = closestElement(range.endContainer, '[data-highlight-scope]')
      if (!startScope || !endScope || startScope !== endScope) return

      const scopeId = startScope.getAttribute('data-highlight-scope')?.trim()
      const anchorId = startScope.getAttribute('data-highlight-anchor-id')?.trim()
      if (!scopeId || !anchorId) return

      const quote = plainTextForProfileHighlightUi(sel.toString() ?? '')
      if (!quote) return

      let startOffset = 0
      let endOffset = 0
      try {
        startOffset = textOffsetWithinScope(startScope, range.startContainer, range.startOffset)
        endOffset = textOffsetWithinScope(startScope, range.endContainer, range.endOffset)
      } catch {
        return
      }
      if (endOffset <= startOffset) return

      const locationLabel = plainTextForProfileHighlightUi(
        startScope.getAttribute('data-highlight-location-label')?.trim() || 'Highlighted text'
      )

      const added = addHighlight({
        slug: profileInfo.slug,
        resourceTitle: profileInfo.title,
        anchorId,
        locationLabel,
        scopeId,
        quote,
        startOffset,
        endOffset,
      })
      if (!added) return

      refreshHighlights()
      setActiveHighlightId(added.id)
      if (activeHighlightTimerRef.current != null) window.clearTimeout(activeHighlightTimerRef.current)
      activeHighlightTimerRef.current = window.setTimeout(() => setActiveHighlightId(null), 1800)
      sel.removeAllRanges()
    }

    document.addEventListener('mouseup', handleSelectionEnd)
    document.addEventListener('touchend', handleSelectionEnd)
    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd)
      document.removeEventListener('touchend', handleSelectionEnd)
    }
  }, [isHydrated, profileInfo?.slug, profileInfo?.title, refreshHighlights])

  // Scripture verse pins (localStorage only — yellow slot + tinted bookmarks per profile slug)
  const [versePinMap, setVersePinMap] = useState<VersePinsStoredState>(createEmptyVersePinsState)
  const [modalPinDraftColor, setModalPinDraftColor] = useState<VersePinColorId>('yellow')

  /** Picker draft when anchors/reference last synced — detect user edits vs synced default */
  const modalPinBaselineRef = useRef<VersePinColorId>('yellow')

  /** Anchors for navigation + pin commit (matches the passage row in the modal). */
  const modalOpenAnchorsRef = useRef<{
    reference: string
    sectionId: string
    subsectionId: string
  } | null>(null)

  useLayoutEffect(() => {
    if (!profileInfo?.slug) return
    setVersePinMap(loadVersePins(profileInfo.slug))
  }, [profileInfo?.slug])

  useLayoutEffect(() => {
    refreshHighlights()
  }, [refreshHighlights])

  useEffect(() => {
    return () => {
      if (activeHighlightTimerRef.current != null) {
        window.clearTimeout(activeHighlightTimerRef.current)
      }
    }
  }, [])

  const versePinsList = useMemo(() => versePinsListFromState(versePinMap), [versePinMap])

  const syncModalAnchorsForNav = useCallback(
    (reference: string, explicit?: { sectionId: string; subsectionId: string }) => {
      let sectionId = explicit?.sectionId?.trim() ?? ''
      let subsectionId = explicit?.subsectionId?.trim() ?? ''
      if (!sectionId || !subsectionId) {
        const pinned = modalOpenAnchorsRef.current
        if (pinned?.reference === reference) {
          sectionId = pinned.sectionId
          subsectionId = pinned.subsectionId
        } else if (sections) {
          const found = findFirstScriptureCardAnchors(sections, reference)
          if (found) {
            sectionId = found.sectionId
            subsectionId = found.subsectionId
          }
        }
      }
      if (sectionId && subsectionId) {
        modalOpenAnchorsRef.current = { reference, sectionId, subsectionId }
      } else {
        modalOpenAnchorsRef.current = {
          reference,
          sectionId: 'modal-view',
          subsectionId: 'modal-view',
        }
      }
    },
    [sections]
  )

  const handleRemoveVersePin = useCallback(
    (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => {
      const s = profileInfo?.slug
      if (!s) return
      const next =
        pin.bookmarkId != null && pin.bookmarkId !== ''
          ? removeVersePin(s, { kind: 'bookmark', bookmarkId: pin.bookmarkId })
          : removeVersePin(s, { kind: 'yellow' })
      setVersePinMap(next)
    },
    [profileInfo?.slug]
  )

  const handleClearAllVersePins = useCallback(() => {
    const s = profileInfo?.slug
    if (!s) return
    clearAllVersePins(s)
    setVersePinMap(loadVersePins(s))
  }, [profileInfo?.slug])

  const focusHighlightById = useCallback((highlightId: string) => {
    setActiveHighlightId(highlightId)
    if (activeHighlightTimerRef.current != null) window.clearTimeout(activeHighlightTimerRef.current)
    activeHighlightTimerRef.current = window.setTimeout(() => setActiveHighlightId(null), 2400)
  }, [])

  const requestRemoveHighlightFromBody = useCallback(
    async (highlightId: string) => {
      const ok = await showConfirm('Remove this highlight?')
      if (!ok) return
      removeHighlight(highlightId)
      refreshHighlights()
      setActiveHighlightId((cur) => (cur === highlightId ? null : cur))
    },
    [showConfirm, refreshHighlights]
  )

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
    if (sections && profileInfo) {
      collectFavoriteReferences(sections)
    }
  }, [sections, profileInfo])

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
    if (profileInfo && profileInfo.slug && profileInfo.slug !== 'admin') {
      trackVisit()
    }
  }, [profileInfo])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScripture.isOpen, favoriteReferences, currentReferenceIndex])

  // All scripture *cards* in profile order, with DOM anchors (duplicate references = separate entries).
  const allScriptureRefs: ScriptureRefNav[] = useMemo(
    () =>
      sections
        ? sections.flatMap((section) => {
            const sid = `section-${section.section}`
            return section.subsections.flatMap((subsection, subIndex) => {
              const subId = `${sid}-${subIndex}`
              const main: ScriptureRefNav[] = (subsection.scriptureReferences || []).map((ref) => ({
                reference: ref.reference,
                sectionId: sid,
                subsectionId: subId,
              }))
              const nested: ScriptureRefNav[] = (subsection.nestedSubsections || []).flatMap((nested, n) => {
                const nestedId = `${sid}-${subIndex}-${n}`
                return (nested.scriptureReferences || []).map((ref) => ({
                  reference: ref.reference,
                  sectionId: sid,
                  subsectionId: nestedId,
                }))
              })
              return [...main, ...nested]
            })
          })
        : [],
    [sections]
  )

  const handleScriptureClick = (
    reference: string,
    anchorSectionId?: string,
    anchorSubsectionId?: string
  ) => {
    let sectionId = anchorSectionId?.trim() ?? ''
    let subsectionId = anchorSubsectionId?.trim() ?? ''
    if (!sectionId || !subsectionId) {
      if (sections) {
        const found = findFirstScriptureCardAnchors(sections, reference)
        if (found) {
          sectionId = found.sectionId
          subsectionId = found.subsectionId
        }
      }
    }

    const navEntry =
      sectionId && subsectionId
        ? allScriptureRefs.find(
            r => r.reference === reference && r.sectionId === sectionId && r.subsectionId === subsectionId
          )
        : undefined

    if (sectionId && subsectionId) {
      modalOpenAnchorsRef.current = { reference, sectionId, subsectionId }
    } else {
      modalOpenAnchorsRef.current = {
        reference,
        sectionId: 'modal-view',
        subsectionId: 'modal-view',
      }
    }

    if (favoriteReferences.length > 0) {
      const favIndex = favoriteReferences.indexOf(reference)
      if (favIndex !== -1) setCurrentReferenceIndex(favIndex)
    } else {
      const allIndex = navEntry
        ? allScriptureRefs.indexOf(navEntry)
        : allScriptureRefs.findIndex(r => r.reference === reference)
      if (allIndex !== -1) setCurrentReferenceIndex(allIndex)
    }
    
    setSelectedScripture({ 
      reference, 
      isOpen: true,
    })
  }

  const navListLength =
    favoriteReferences.length > 0 ? favoriteReferences.length : allScriptureRefs.length
  
  // Navigation functions for favorite references or all references if no favorites
  const navigateToPrevious = useCallback(() => {
    if (navListLength === 0) return

    if (favoriteReferences.length > 0) {
      const newIndex = (currentReferenceIndex - 1 + navListLength) % navListLength
      setCurrentReferenceIndex(newIndex)
      const reference = favoriteReferences[newIndex]!
      const entry = allScriptureRefs.find(r => r.reference === reference)
      syncModalAnchorsForNav(
        reference,
        entry
          ? { sectionId: entry.sectionId, subsectionId: entry.subsectionId }
          : undefined
      )
      setSelectedScripture({
        reference,
        isOpen: true,
      })
      return
    }

    const newIndex = (currentReferenceIndex - 1 + allScriptureRefs.length) % allScriptureRefs.length
    setCurrentReferenceIndex(newIndex)
    const item = allScriptureRefs[newIndex]!
    syncModalAnchorsForNav(item.reference, {
      sectionId: item.sectionId,
      subsectionId: item.subsectionId,
    })
    setSelectedScripture({
      reference: item.reference,
      isOpen: true,
    })
  }, [
    favoriteReferences,
    navListLength,
    currentReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
  ])

  const navigateToNext = useCallback(() => {
    if (navListLength === 0) return

    if (favoriteReferences.length > 0) {
      const newIndex = (currentReferenceIndex + 1) % navListLength
      setCurrentReferenceIndex(newIndex)
      const reference = favoriteReferences[newIndex]!
      const entry = allScriptureRefs.find(r => r.reference === reference)
      syncModalAnchorsForNav(
        reference,
        entry
          ? { sectionId: entry.sectionId, subsectionId: entry.subsectionId }
          : undefined
      )
      setSelectedScripture({
        reference,
        isOpen: true,
      })
      return
    }

    const newIndex = (currentReferenceIndex + 1) % allScriptureRefs.length
    setCurrentReferenceIndex(newIndex)
    const item = allScriptureRefs[newIndex]!
    syncModalAnchorsForNav(item.reference, {
      sectionId: item.sectionId,
      subsectionId: item.subsectionId,
    })
    setSelectedScripture({
      reference: item.reference,
      isOpen: true,
    })
  }, [
    favoriteReferences,
    navListLength,
    currentReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
  ])

  // Navigation state: enabled if more than one reference available
  const hasPrevious = navListLength > 1
  const hasNext = navListLength > 1

  const modalPassageAnchorsForPins: VersePinSlotEntry | null = useMemo(() => {
    // When the same reference string appears on multiple cards, prev/next updates
    // `modalOpenAnchorsRef` + `currentReferenceIndex`; reference alone may not change.
    void currentReferenceIndex
    if (!selectedScripture.isOpen || !selectedScripture.reference.trim()) return null
    const refStr = selectedScripture.reference
    const snap = modalOpenAnchorsRef.current
    if (
      snap?.reference === refStr &&
      snap.sectionId?.trim() !== '' &&
      snap.subsectionId?.trim() !== ''
    ) {
      return {
        reference: refStr,
        sectionId: snap.sectionId,
        subsectionId: snap.subsectionId,
      }
    }
    if (sections) {
      const found = findFirstScriptureCardAnchors(sections, refStr)
      if (found) {
        return {
          reference: refStr,
          sectionId: found.sectionId,
          subsectionId: found.subsectionId,
        }
      }
    }
    return { reference: refStr, sectionId: '', subsectionId: '' }
  }, [
    selectedScripture.isOpen,
    selectedScripture.reference,
    sections,
    currentReferenceIndex,
  ])

  useEffect(() => {
    if (!selectedScripture.isOpen || !modalPassageAnchorsForPins?.reference) return
    const existing = versePinColorForPassage(versePinMap, modalPassageAnchorsForPins)
    /** Yellow = last verse viewed for unpinned passages; otherwise whichever color pins this passage. */
    const synced: VersePinColorId = existing ?? 'yellow'
    modalPinBaselineRef.current = synced
    setModalPinDraftColor(synced)
  }, [selectedScripture.isOpen, selectedScripture.reference, modalPassageAnchorsForPins, versePinMap])

  const modalPinDropdownColors = useMemo(
    () =>
      modalPassageAnchorsForPins
        ? availablePinColorsForModalChoice(versePinMap, modalPassageAnchorsForPins)
        : [],
    [versePinMap, modalPassageAnchorsForPins]
  )

  const closeModal = () => {
    const refTxt = selectedScripture.reference.trim()
    if (refTxt && profileInfo?.slug) {
      const snap = modalOpenAnchorsRef.current
      let sectionId =
        snap?.reference === refTxt ? (snap.sectionId?.trim() ?? '') : ''
      let subsectionId =
        snap?.reference === refTxt ? (snap.subsectionId?.trim() ?? '') : ''
      if (!sectionId || !subsectionId) {
        const found = sections ? findFirstScriptureCardAnchors(sections, refTxt) : null
        if (found) {
          sectionId = found.sectionId
          subsectionId = found.subsectionId
        }
      }
      const entry: VersePinSlotEntry = {
        reference: refTxt,
        sectionId: sectionId || 'modal-view',
        subsectionId: subsectionId || 'modal-view',
      }
      const draft = modalPinDraftColor
      const baseline = modalPinBaselineRef.current
      const unchanged = draft === baseline

      if (unchanged) {
        if (shouldAdvanceYellowLastViewed(versePinMap, entry)) {
          const nextMap = assignYellowLastViewed(profileInfo.slug, entry)
          setVersePinMap(nextMap)
        }
      } else {
        const nextMap = assignVersePin(profileInfo.slug, draft, entry)
        setVersePinMap(nextMap)
      }
    }
    modalPinBaselineRef.current = 'yellow'
    setModalPinDraftColor('yellow')
    modalOpenAnchorsRef.current = null
    setSelectedScripture({ reference: '', isOpen: false })
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleMemorizationPracticeStart = (verse: MemorizedVerse) => {
    setMemorizationPracticeVerse(verse)
    closeMenu()
  }

  useEffect(() => {
    const onTourCloseMenu = (): void => {
      setIsMenuOpen(false)
    }
    window.addEventListener(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT, onTourCloseMenu)
    return () => window.removeEventListener(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT, onTourCloseMenu)
  }, [])

  // Early return if required props are missing - moved after all hooks
  if (!sections || !profileInfo) {
    return <div>Loading...</div>
  }

  return (
    <>
      <PresentationFirstVisitWelcome />
      {/* Print-only header - appears at top of first page */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 className="print-title">The Gospel Presentation</h1>
      </div>

      {/* Unified Layout - Hamburger menu at all screen sizes */}
      <div className="flex min-h-screen flex-col">
        {/* Header with hamburger menu and optional edit button */}
        <div data-profile-sticky-header className="sticky top-[env(safe-area-inset-top,0px)] z-40 bg-white/70 dark:bg-slate-800/90 backdrop-blur-sm shadow-md print-hide">
          <div className="w-full px-5 py-3">
            <div className="flex justify-between items-center gap-3">
              <button
                type="button"
                data-tour="profile-menu-button"
                onClick={toggleMenu}
                className="flex items-center gap-3 px-4 py-2 rounded-md transition-colors cursor-pointer bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white"
              >
                <div className="flex flex-col gap-1">
                  <div className={`w-5 h-0.5 bg-slate-800 dark:bg-white transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                  <div className={`w-5 h-0.5 bg-slate-800 dark:bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                  <div className={`w-5 h-0.5 bg-slate-800 dark:bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
                <span className="font-medium">Menu</span>
              </button>
              
              {/* Right side content */}
              <div className="flex items-center gap-3">
                {/* Profile Info and Edit Button - only show when previewing from editor */}
                {canEdit && fromEditor && (
                  <>
                    {/* Profile Info */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{profileInfo?.title || 'Gospel Profile'}</div>
                      {profileInfo?.favoriteScriptures && profileInfo.favoriteScriptures.length > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
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
                <ProfileHelpMenu />
                <HighlightsDropdown
                  profileSlug={profileInfo.slug}
                  onOpenHighlight={(h) => focusHighlightById(h.id)}
                  onHighlightsChanged={refreshHighlights}
                />
                <BookmarksDropdown
                  sections={sections}
                  profileTitle={profileInfo.title}
                  profileSlug={profileInfo.slug}
                />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Hover trigger area on left edge */}
        <div 
          className="hidden lg:block fixed left-0 top-0 h-full w-12 z-30 print-hide"
          onMouseEnter={() => setIsMenuOpen(true)}
        />

        {/* Main Content Area — flex-1 so the column fills the viewport; click closes slide-out on desktop (mobile uses full-screen overlay) */}
        <div
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          onClick={isMenuOpen ? closeMenu : undefined}
        >
          <main className="container mx-auto px-5 py-10">
            <div className="space-y-12">
              {sections.map((section) => (
                <div key={section.section} className="print-section">
                  <GospelSection 
                    section={section}
                    onScriptureClick={handleScriptureClick}
                    versePins={versePinsList}
                    onRemoveVersePin={handleRemoveVersePin}
                    profileSlug={profileInfo.slug}
                    savedAnswers={profileInfo.savedAnswers}
                    isLoggedIn={!!userEmail}
                    highlightsByScopeId={highlightsByScopeId}
                    activeHighlightId={activeHighlightId}
                    onHighlightMarkClick={requestRemoveHighlightFromBody}
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
            data-tour="profile-slideout-menu"
            className="fixed top-[env(safe-area-inset-top,0px)] bottom-0 left-0 z-50 bg-white dark:bg-slate-800 w-80 shadow-2xl overflow-y-auto border-r border-gray-200 dark:border-slate-600 transform transition-transform duration-300 ease-in-out print-hide"
            onMouseLeave={() => {
              // Keep menu open during driver.js tours so the slide-out stays mounted on desktop hover-close
              if (typeof document !== 'undefined' && document.body.classList.contains('driver-active')) {
                return
              }
              if (deferCloseMenuForFilePickerRef.current) {
                return
              }
              // Only auto-close on desktop when mouse leaves
              if (window.innerWidth >= 1024) {
                closeMenu()
              }
            }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-200 dark:border-slate-600">
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">
                  Table of Contents
                </h3>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="lg:hidden cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <TableOfContents
                sections={sections}
                currentProfileSlug={profileInfo.slug}
                onNavigate={closeMenu}
                onMemorizationPracticeStart={handleMemorizationPracticeStart}
                onOpenSpurgeonLibrary={() => {
                  setSpurgeonStudyReference(null)
                  setIsSpurgeonLibraryOpen(true)
                }}
              />
              
              {/* Profile Info in Sidebar */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">{profileInfo?.title || 'Gospel Profile'}</div>
                {profileInfo?.description && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{profileInfo.description}</div>
                )}
                {profileInfo?.favoriteScriptures && profileInfo.favoriteScriptures.length > 0 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    📖 {profileInfo.favoriteScriptures.length} favorite{profileInfo.favoriteScriptures.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {/* Scripture Progress Section - show when profile exists (localStorage for anonymous/default) */}
                <div
                  className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-600"
                  data-tour="toc-verse-pins"
                >
                  {versePinsList.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Pinned passages ({versePinsList.length})
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                        {versePinsList.map((p) => (
                          <li
                            key={p.bookmarkId ?? `y-${p.reference}-${p.sectionId}-${p.subsectionId}`}
                            className="flex items-center gap-1.5 truncate"
                          >
                            <span className="shrink-0" aria-hidden>
                              📌
                            </span>
                            <span className="truncate" title={`${p.colorId}: ${p.reference}`}>
                              {p.reference}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        data-tour="toc-reset-progress"
                        onClick={handleClearAllVersePins}
                        className="w-full cursor-pointer rounded px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                        aria-label="Clear all pinned passages for this presentation"
                      >
                        Clear pinned passages
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                      Open scripture and choose a pin color beside Memorize — yellow tracks your last passage; other tints can repeat across passages. Saved on this device only.
                    </div>
                  )}
                </div>
            </div>

              <MenuLocalDataBackup deferCloseMenuForFilePickerRef={deferCloseMenuForFilePickerRef} />
              <SidebarAuthNav />
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="bg-slate-700 dark:bg-slate-900 text-white py-10 mt-16 print-hide">
        <div className="container mx-auto px-5 max-w-3xl">
          <div className="space-y-4 text-sm opacity-90 leading-relaxed text-center md:text-left">
            <ScriptureFooterAttributionParagraphs
              anchorClassName="text-blue-400 hover:text-blue-300 underline"
              enabledTranslationCodes={footerAttributionEnabledCodes}
            />
          </div>
          <div className="mt-8 pt-6 border-t border-slate-600 flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/info" className="text-blue-400 hover:text-blue-300 underline">
              App Info & QR Codes
            </Link>
            <Link href="/copyright" className="text-blue-400 hover:text-blue-300 underline">
              Copyright & Attribution
            </Link>
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </Link>
          </div>
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
        versePinControl={{
          draftColor: modalPinDraftColor,
          onDraftColorChange: setModalPinDraftColor,
          colorsAvailableInDropdown: modalPinDropdownColors,
        }}
        onOpenSpurgeonStudy={(ref) => {
          setSpurgeonStudyReference(ref)
          setIsSpurgeonLibraryOpen(true)
        }}
      />

      <SpurgeonSermonsModal
        isOpen={isSpurgeonLibraryOpen}
        initialByReference={spurgeonStudyReference}
        onFollowSermonLink={() => {
          closeModal()
          setMemorizationPracticeVerse(null)
        }}
        onClose={() => {
          setIsSpurgeonLibraryOpen(false)
          setSpurgeonStudyReference(null)
        }}
      />

      {typeof document !== 'undefined' &&
        memorizationPracticeVerse &&
        createPortal(
          <MemorizationPracticeSession
            verse={memorizationPracticeVerse}
            onClose={() => setMemorizationPracticeVerse(null)}
            onPersistInProgress={(payload) => {
              saveMemorizationInProgress(memorizationPracticeVerse.id, payload)
            }}
            onClearInProgress={() => {
              clearMemorizationInProgress(memorizationPracticeVerse.id)
              setMemorizationPracticeVerse(
                loadMemorizedVerses().find((v) => v.id === memorizationPracticeVerse.id) ?? null
              )
            }}
            onComplete={(result) => {
              updatePracticeStats(memorizationPracticeVerse.id, {
                wrongAttempts: result.wrongAttempts,
                correctKeystrokes: result.correctKeystrokes,
                completed: result.completed,
              })
            }}
            onOpenSpurgeonStudy={(ref) => {
              setSpurgeonStudyReference(ref)
              setIsSpurgeonLibraryOpen(true)
            }}
          />,
          document.body
        )}
    </>
  )
}

// Export named for testing (allows focused tests to import internals)
export { ProfileContent }
export default ProfileContent