'use client'

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'
import { usePresentationScrollReadComplete } from '@/hooks/usePresentationScrollReadComplete'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import GospelSection from '@/components/GospelSection'
import ScriptureModal from '@/components/ScriptureModal'
import MemorizationPracticeSession from '@/components/MemorizationPracticeSession'
import TableOfContents from '@/components/TableOfContents'
import ProfileResourceTabs from '@/components/ProfileResourceTabs'
import SpurgeonSermonsModal, {
  STUDY_MODAL_DEFAULT_TITLE,
  type StudyLibraryFocus,
} from '@/components/SpurgeonSermonsModal'
import MorneveDevotionsModal from '@/components/MorneveDevotionsModal'
import McheyneReadingPlanModal from '@/components/McheyneReadingPlanModal'
import BiblePassagePickerModal from '@/components/BiblePassagePickerModal'
import SidebarAuthNav from '@/components/SidebarAuthNav'
import MenuLocalDataBackup from '@/components/MenuLocalDataBackup'
import ThemeToggle from '@/components/ThemeToggle'
import BookmarksDropdown from '@/components/BookmarksDropdown'
import HighlightsDropdown from '@/components/HighlightsDropdown'
import ProfileResourceReadAloud from '@/components/ProfileResourceReadAloud'
import ProfileHelpMenu from '@/components/ProfileHelpMenu'
import PresentationFirstVisitWelcome from '@/components/PresentationFirstVisitWelcome'
import { ScriptureFooterAttributionParagraphs } from '@/components/ScriptureFooterAttributionParagraphs'
import { GospelSection as GospelSectionType, GospelProfile, SavedAnswer } from '@/lib/types'
import type {
  VersePinAnchoredEntry,
  VersePinColorId,
  VersePinsStoredState,
  VersePinSlotEntry,
  VerseBookmarkColorId,
} from '@/lib/versePinStorage'
import {
  assignVersePin,
  assignYellowLastViewed,
  availablePinColorsForModalChoice,
  clearAllVersePins,
  createEmptyVersePinsState,
  hydrateVersePinsFromStorage,
  loadVersePins,
  removeVersePin,
  shouldAdvanceYellowLastViewed,
  versePinColorForPassage,
  versePinsListFromState,
} from '@/lib/versePinStorage'
import { logger } from '@/lib/logger'
import {
  profileMenuLabelMinViewportPx,
  showProfileMenuLabelForViewport,
} from '@/lib/profileHeaderMenuLabel'
import { isMemorizeAndroidWebHost } from '@/lib/memorizationViewportPlatform'
import { shareResourceUrl } from '@/lib/shareResourceUrl'
import { createClient } from '@/lib/supabase/client'
import { useAlertModal } from '@/contexts/AlertModalContext'
import { useTranslation, type BibleTranslation } from '@/contexts/TranslationContext'
import { isBibleTranslation } from '@/lib/bible-translations'
import { GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import {
  GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT,
  isPresentationReadComplete,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
  removePresentationReadCompleteSlug,
} from '@/lib/presentationReadCompleteStorage'
import { scrollToTocAnchor, scrollToTocAnchorWhenReady } from '@/lib/scrollToTocAnchor'
import { hydrateGospelClientStorage } from '@/lib/gospelClientStorage'
import {
  prefetchPublicResourcesMenu,
  shouldLoadPublicResourcesMenu,
} from '@/lib/publicResourcesMenuClient'
import { consumePendingBookmarkResume } from '@/lib/profileBookmarkResumeSession'
import {
  captureReadingPositionAtViewport,
  isReadingPositionFingerprintValid,
  listenTextOptionsForProfileSlug,
  restoreReadingPosition,
  resolveReadingScope,
} from '@/lib/profileReadingPosition'
import {
  clearProfileReadingResume,
  loadProfileReadingResume,
  saveProfileReadingResume,
  type ProfileReadingResumeV1,
} from '@/lib/profileReadingResumeStorage'
import {
  GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT,
  loadProfileRecentResourcesForTabs,
  recordProfileLastOpenOnEnter,
  recordScriptureLastOpen,
  buildProfileRecentScriptureHref,
  removeProfileResourceTab,
  resolveProfileTabNavigationAfterClose,
  type ProfileRecentScriptureEntry,
} from '@/lib/profileLastOpenResourceStorage'
import {
  clearProfileResourceTabNavigationStaging,
  markProfileResourceTabNavigation,
  peekProfileResourceTabNavigation,
} from '@/lib/profileResourceTabNavigation'
import { mcheyneDayChapterReferencesForAnchor } from '@/lib/mcheyne/mcheyneReadingDay'
import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'
import {
  findMcheyneDayAnchor,
  mcheyneDaySubsectionIdFromAnchor,
} from '@/lib/mcheyne/mcheyneReadingDay'
import {
  resolveMcheynePlanDayFromNavigation,
  resolveMcheyneResumePinFromNavigation,
  setPendingMcheynePlanDay,
  setPendingMcheyneResumePin,
} from '@/lib/mcheyne/mcheynePendingNavigation'
import { loadMcheyneYellowPinForResume } from '@/lib/mcheyne/mcheyneResumeYellowPin'
import {
  cancelMcheyneResumeScroll,
  finishMcheyneResumeScrollSession,
  startMcheyneResumeScroll,
} from '@/lib/mcheyne/mcheyneResumeScrollSession'
import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import {
  adjacentPickerPassage,
  pickerPassageHasNext,
  pickerPassageHasPrevious,
} from '@/lib/biblePassagePickerNavigation'
import { isChapterOnlyScriptureReference } from '@/lib/parse-scripture-reference'
import { findFirstStudyPassageAnchor } from '@/lib/findFirstStudyPassageAnchor'
import { presentationLocationFromProfileAnchors } from '@/lib/presentationLocationFromAnchors'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
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
  /** Called when automatic reading resume finishes or is skipped (e.g. reveal site header after tab switch). */
  onReadingResumeSettled?: () => void
  /** When false, defer POST /visit until profile cache validation finishes (avoids racing /modified). */
  allowVisitTracking?: boolean
}

/** One scripture card in profile order (for modal prev/next without collapsing duplicate references). */
interface ScriptureRefNav {
  reference: string
  sectionId: string
  subsectionId: string
  /** Plain text, TOC-aligned (stripHtmlTags). */
  sectionTitle: string
  /** Parent subsection title (plain); nested cards use the same parent title here. */
  subsectionTitle: string
  /** Set only for scripture cards under `nestedSubsections`. */
  nestedSubsectionTitle?: string
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

function versePinSlotEntryFromModalPinKey(pinKey: string): VersePinSlotEntry | null {
  const sep = pinKey.indexOf('|')
  if (sep < 0) return null
  const reference = pinKey.slice(0, sep).trim()
  const rest = pinKey.slice(sep + 1)
  const sep2 = rest.indexOf('|')
  if (sep2 < 0 || !reference) return null
  const sectionId = rest.slice(0, sep2)
  const subsectionId = rest.slice(sep2 + 1)
  return {
    reference,
    sectionId: sectionId || 'modal-view',
    subsectionId: subsectionId || 'modal-view',
  }
}

function isVerseBookmarkColorId(color: VersePinColorId): color is VerseBookmarkColorId {
  return color !== 'yellow'
}

function textOffsetWithinScope(scopeEl: HTMLElement, node: Node, nodeOffset: number): number {
  return visibleTextLengthBeforeBoundary(scopeEl, node, nodeOffset)
}

/** Scripture modal open state (user selection, deep link, or picker navigation). */
type ScriptureModalState = {
  reference: string
  isOpen: boolean
  initialChapterView?: boolean
  /** Prev/next move by verse/chapter in-book (Bible Reader or header passage picker). */
  pickerNavigation?: boolean
}

function ProfileContent({
  sections,
  profileInfo,
  onReadingResumeSettled,
  allowVisitTracking = true,
}: ProfileContentProps) {
  const [selectedScripture, setSelectedScripture] = useState<ScriptureModalState>({
    reference: '',
    isOpen: false,
  })
  /** When set, matches `scriptureRef` query param the user dismissed (deep link modal closed). */
  const [dismissedScriptureRefParam, setDismissedScriptureRefParam] = useState<string | null>(
    null
  )
  const deepLinkTranslationAppliedRef = useRef<string | null>(null)
  /** Avoid duplicate M'Cheyne plan-day scroll when the nav effect re-runs before query params clear. */
  const mcheynePlanDayScrollRef = useRef<number | null>(null)
  /** Avoid duplicate resume-pin scroll when the nav effect re-runs before query params clear. */
  const mcheyneResumePinScrollRef = useRef(false)
  /** Cancel function for the active resume-pin scroll RAF loop (effect or Resume button). */
  const mcheyneResumeScrollCancelRef = useRef<(() => void) | null>(null)
  const profileReadingNavAppliedRef = useRef(false)
  const profileReadingNavSlugRef = useRef<string | null>(null)
  const readingResumeRestoreSessionRef = useRef<{
    cancelScroll: () => void
    abortUserIntent: AbortController
  } | null>(null)
  const readingResumeSaveTimerRef = useRef<number | null>(null)
  const readingResumeSaveIdleRef = useRef<number | null>(null)
  const readingResumeSaveUsesIdleCallbackRef = useRef(false)
  const flushReadingResumeSaveRef = useRef<(reason?: string) => void>(() => {})
  type TabNavStagingRef =
    | { status: 'unset' }
    | { status: 'not-tab-nav' }
    | { status: 'ready'; resume: ProfileReadingResumeV1 | null }
  const tabNavStagingRef = useRef<TabNavStagingRef>({ status: 'unset' })
  const tabNavLayoutSlugRef = useRef<string | null>(null)

  const [currentReferenceIndex, setCurrentReferenceIndex] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSharingResource, setIsSharingResource] = useState(false)
  const [isSpurgeonLibraryOpen, setIsSpurgeonLibraryOpen] = useState(false)
  const [isMorneveLibraryOpen, setIsMorneveLibraryOpen] = useState(false)
  const [isMcheynePlanModalOpen, setIsMcheynePlanModalOpen] = useState(false)
  const [bibleReaderOpen, setBibleReaderOpen] = useState(false)
  /** When opening study library from the scripture modal “Study”, pre-fill By scripture with this reference. */
  const [spurgeonStudyReference, setSpurgeonStudyReference] = useState<string | null>(null)
  const [studyModalTitle, setStudyModalTitle] = useState(STUDY_MODAL_DEFAULT_TITLE)
  const [studyLibraryFocus, setStudyLibraryFocus] = useState<StudyLibraryFocus>('all')
  /** Skip desktop `onMouseLeave` close while the restore JSON file picker is open (keeps `<input type="file">` mounted). */
  const deferCloseMenuForFilePickerRef = useRef(false)
  const [memorizationPracticeVerse, setMemorizationPracticeVerse] = useState<MemorizedVerse | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [fromEditor] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('preview') === 'true'
  })
  const [highlightRevision, setHighlightRevision] = useState(0)
  const [versePinRevision, setVersePinRevision] = useState(0)
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null)
  const activeHighlightTimerRef = useRef<number | null>(null)
  const { showConfirm, showAlert } = useAlertModal()
  const { translation, enabledTranslations, isLoading: translationsLoading, setTranslation } =
    useTranslation()
  const footerAttributionEnabledCodes = translationsLoading ? null : enabledTranslations
  /** Matches `ProfileResourceReadAloud` (Listen hidden on Android Web hosts). */
  const profileHeaderAndroidHost = useMemo(() => isMemorizeAndroidWebHost(), [])

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const studyRefParam = searchParams.get('studyRef')?.trim() ?? ''
  const scriptureRefParam = searchParams.get('scriptureRef')?.trim().replace(/–/g, '-') ?? ''
  const scriptureViewParam = searchParams.get('scriptureView')?.trim() ?? ''
  const translationParam = searchParams.get('translation')?.trim().toLowerCase() ?? ''
  const mcheynePlanDayParam = searchParams.get('planDay')?.trim() ?? ''
  const mcheyneResumePinParam = searchParams.get('resumePin')?.trim() ?? ''

  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const showMenuLabel = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {}
      const minPx = profileMenuLabelMinViewportPx(profileHeaderAndroidHost)
      if (typeof window.matchMedia !== 'function') {
        window.addEventListener('resize', onStoreChange)
        return () => window.removeEventListener('resize', onStoreChange)
      }
      const mq = window.matchMedia(`(min-width: ${minPx}px)`)
      mq.addEventListener('change', onStoreChange)
      return () => mq.removeEventListener('change', onStoreChange)
    },
    () =>
      typeof window !== 'undefined'
        ? typeof window.matchMedia === 'function'
          ? window.matchMedia(`(min-width: ${profileMenuLabelMinViewportPx(profileHeaderAndroidHost)}px)`)
              .matches
          : showProfileMenuLabelForViewport(window.innerWidth, profileHeaderAndroidHost)
        : true,
    () => true
  )

  // Check authentication and role
  useEffect(() => {
    if (!isHydrated) return // Skip until hydrated

    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check user role
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single<{ role: string }>()
        
        if (userProfile?.role === 'admin') {
          setCanEdit(true)
        }
      }
    }
    checkAuth()
  }, [isHydrated])

  // Warm Resources menu list before the slide-out mounts (session cache + deduped fetch).
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !shouldLoadPublicResourcesMenu(!!user)) return
      prefetchPublicResourcesMenu()
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const sectionCount = sections?.length ?? 0
  const profileSlug = profileInfo?.slug ?? ''

  const bumpHighlights = useCallback(() => {
    setHighlightRevision((v) => v + 1)
  }, [])

  const profileHighlights = useMemo((): ProfileHighlight[] => {
    void highlightRevision
    if (!profileSlug) return []
    return highlightsForSlug(profileSlug)
  }, [profileSlug, highlightRevision])

  const bumpVersePins = useCallback(() => {
    setVersePinRevision((v) => v + 1)
  }, [])

  const versePinMap = useMemo((): VersePinsStoredState => {
    void versePinRevision
    if (!profileSlug) return createEmptyVersePinsState()
    return loadVersePins(profileSlug)
  }, [profileSlug, versePinRevision])

  // Verse pins are stored in IndexedDB; warm the sync cache after navigation or reload.
  useEffect(() => {
    if (!profileSlug) return
    let cancelled = false
    void hydrateVersePinsFromStorage(profileSlug).then(() => {
      if (!cancelled) bumpVersePins()
    })
    return () => {
      cancelled = true
    }
  }, [profileSlug, bumpVersePins])

  useEffect(() => {
    if (!profileSlug) return
    recordProfileLastOpenOnEnter(profileSlug, profileInfo?.title ?? '')
  }, [profileSlug, profileInfo?.title])

  const [resourceTabs, setResourceTabs] = useState(() =>
    loadProfileRecentResourcesForTabs(profileSlug, profileInfo?.title)
  )

  const refreshResourceTabs = useCallback(() => {
    setResourceTabs(loadProfileRecentResourcesForTabs(profileSlug, profileInfo?.title))
  }, [profileSlug, profileInfo?.title])

  useEffect(() => {
    window.addEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, refreshResourceTabs)
    return () => {
      window.removeEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, refreshResourceTabs)
    }
  }, [refreshResourceTabs])

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

  const flushReadingResumeSave = useCallback(
    (flushReason?: string) => {
      if (!profileSlug || sectionCount === 0) return
      if (selectedScripture.isOpen) return
      if (typeof document !== 'undefined' && document.querySelector('.profile-help-tour-popover')) {
        return
      }

      let captured
      try {
        captured = captureReadingPositionAtViewport(sections, profileSlug)
      } catch {
        return
      }
      if (!captured) return

      if (
        (flushReason === 'tab-select-leave' || flushReason === 'visibility-hide') &&
        typeof window !== 'undefined' &&
        window.scrollY <= 8
      ) {
        const existing = loadProfileReadingResume(profileSlug)
        // Only block regress within the same section (route scroll reset at top). A different
        // anchor means the reader moved sections and we should persist that navigation.
        if (
          existing &&
          existing.anchorId === captured.anchorId &&
          existing.plainOffset > captured.plainOffset
        ) {
          return
        }
      }

      saveProfileReadingResume(
        profileSlug,
        captured.anchorId,
        captured.plainOffset,
        captured.fingerprint
      )
    },
    [profileSlug, sectionCount, sections, selectedScripture.isOpen]
  )

  useLayoutEffect(() => {
    flushReadingResumeSaveRef.current = flushReadingResumeSave
  }, [flushReadingResumeSave])

  const READING_RESUME_SAVE_DEBOUNCE_MS = 1500

  const cancelPendingReadingResumeSave = useCallback(() => {
    if (readingResumeSaveTimerRef.current != null) {
      window.clearTimeout(readingResumeSaveTimerRef.current)
      readingResumeSaveTimerRef.current = null
    }
    const idleId = readingResumeSaveIdleRef.current
    if (idleId == null) return
    readingResumeSaveIdleRef.current = null
    if (readingResumeSaveUsesIdleCallbackRef.current && typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(idleId)
    } else {
      window.cancelAnimationFrame(idleId)
    }
  }, [])

  const scheduleFlushReadingResumeSave = useCallback(() => {
    const run = () => {
      readingResumeSaveIdleRef.current = null
      flushReadingResumeSaveRef.current()
    }
    if (typeof requestIdleCallback === 'function') {
      readingResumeSaveUsesIdleCallbackRef.current = true
      readingResumeSaveIdleRef.current = requestIdleCallback(run, { timeout: 3000 })
      return
    }
    readingResumeSaveUsesIdleCallbackRef.current = false
    readingResumeSaveIdleRef.current = window.requestAnimationFrame(run)
  }, [])

  const persistReadingResumeBeforeLeave = useCallback(
    (persistReason?: string) => {
      cancelPendingReadingResumeSave()
      flushReadingResumeSave(persistReason)
    },
    [cancelPendingReadingResumeSave, flushReadingResumeSave]
  )

  const handleSelectResourceTab = useCallback(
    (slug: string) => {
      const trimmed = slug.trim()
      if (!trimmed || trimmed === profileSlug.trim()) return
      persistReadingResumeBeforeLeave('tab-select-leave')
      const saved = loadProfileReadingResume(trimmed)
      markProfileResourceTabNavigation(trimmed, saved)
      router.push(`/${trimmed}`, { scroll: false })
    },
    [profileSlug, router, persistReadingResumeBeforeLeave]
  )

  const handleCloseResourceTab = useCallback(
    (slug: string) => {
      const trimmed = slug.trim()
      if (!trimmed) return
      const isActive = trimmed === profileSlug.trim()
      const nextSlug = isActive ? resolveProfileTabNavigationAfterClose(trimmed) : null
      removeProfileResourceTab(trimmed)
      if (isActive) {
        persistReadingResumeBeforeLeave()
        if (nextSlug) {
          const saved = loadProfileReadingResume(nextSlug)
          markProfileResourceTabNavigation(nextSlug, saved)
          router.push(`/${nextSlug}`, { scroll: false })
        } else {
          router.push('/default')
        }
      }
    },
    [profileSlug, router, persistReadingResumeBeforeLeave]
  )

  useEffect(() => {
    if (!isHydrated || !profileSlug || sectionCount === 0) return

    const scheduleSave = () => {
      cancelPendingReadingResumeSave()
      readingResumeSaveTimerRef.current = window.setTimeout(() => {
        readingResumeSaveTimerRef.current = null
        scheduleFlushReadingResumeSave()
      }, READING_RESUME_SAVE_DEBOUNCE_MS)
    }

    window.addEventListener('scroll', scheduleSave, { passive: true })
    const onHide = () => {
      persistReadingResumeBeforeLeave('visibility-hide')
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)

    return () => {
      window.removeEventListener('scroll', scheduleSave)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      // Do not persist on effect cleanup: scrollY is often 0 during route/tab transitions
      // and would overwrite a valid resume saved in tab-select-leave.
      cancelPendingReadingResumeSave()
    }
  }, [
    isHydrated,
    profileSlug,
    sectionCount,
    cancelPendingReadingResumeSave,
    persistReadingResumeBeforeLeave,
    scheduleFlushReadingResumeSave,
  ])

  useEffect(() => {
    if (profileReadingNavSlugRef.current !== profileSlug) {
      const hadPreviousSlug = profileReadingNavSlugRef.current != null
      profileReadingNavSlugRef.current = profileSlug
      // Fresh mount (ref null): tab-nav useLayoutEffect may have set applied; do not clear.
      if (hadPreviousSlug) {
        profileReadingNavAppliedRef.current = false
      }
    }
  }, [profileSlug])

  const cancelReadingResumeRestore = useCallback(() => {
    const session = readingResumeRestoreSessionRef.current
    if (!session) return
    session.abortUserIntent.abort()
    session.cancelScroll()
    readingResumeRestoreSessionRef.current = null
  }, [])

  const startReadingResumeRestore = useCallback(
    (
      anchorId: string,
      plainOffset: number,
      fingerprint: string,
      onSettled?: () => void
    ) => {
      cancelReadingResumeRestore()
      const abortUserIntent = new AbortController()
      const cancelScroll = restoreReadingPosition(
        anchorId,
        plainOffset,
        fingerprint,
        profileSlug,
        {
          onDone: () => onSettled?.(),
          onGiveUp: () => onSettled?.(),
        }
      )
      readingResumeRestoreSessionRef.current = { cancelScroll, abortUserIntent }

      const stopOnUserIntent = () => {
        if (readingResumeRestoreSessionRef.current?.abortUserIntent !== abortUserIntent) return
        cancelReadingResumeRestore()
      }
      const intentOpts = { passive: true, signal: abortUserIntent.signal } as const
      window.addEventListener('wheel', stopOnUserIntent, intentOpts)
      window.addEventListener('touchstart', stopOnUserIntent, intentOpts)
    },
    [cancelReadingResumeRestore, profileSlug]
  )

  const startReadingResumeRestoreRef = useRef(startReadingResumeRestore)
  const onReadingResumeSettledRef = useRef(onReadingResumeSettled)

  useEffect(() => {
    startReadingResumeRestoreRef.current = startReadingResumeRestore
    onReadingResumeSettledRef.current = onReadingResumeSettled
  }, [startReadingResumeRestore, onReadingResumeSettled])

  useEffect(() => {
    const slugOnMount = profileSlug
    return () => {
      cancelReadingResumeRestore()
      // Abandon in-flight tab-nav restore (layout effect only cancels rAF); clear staging so
      // a later visit to this profile does not peek stale session/memory from an unfinished switch.
      clearProfileResourceTabNavigationStaging(slugOnMount)
    }
  }, [profileSlug, cancelReadingResumeRestore])

  useLayoutEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug) return

    if (tabNavLayoutSlugRef.current !== profileSlug) {
      tabNavLayoutSlugRef.current = profileSlug
      tabNavStagingRef.current = { status: 'unset' }
    }

    if (tabNavStagingRef.current.status === 'unset') {
      const peeked = peekProfileResourceTabNavigation(profileSlug)
      if (peeked === undefined) {
        tabNavStagingRef.current = { status: 'not-tab-nav' }
        return
      }
      tabNavStagingRef.current = { status: 'ready', resume: peeked }
    }

    if (tabNavStagingRef.current.status === 'not-tab-nav') return

    const tabNavResume = tabNavStagingRef.current.resume

    profileReadingNavAppliedRef.current = true
    const settle = () => {
      clearProfileResourceTabNavigationStaging(profileSlug)
      onReadingResumeSettledRef.current?.()
    }

    if (tabNavResume === null) {
      settle()
      return
    }

    const TAB_NAV_RESTORE_MAX_FRAMES = 30
    let cancelled = false

    const runTabNavRestore = (frame: number) => {
      if (cancelled) return

      const scope = resolveReadingScope(tabNavResume.anchorId)
      const listenOpts = listenTextOptionsForProfileSlug(profileSlug)
      const fingerprintValid =
        !scope || isReadingPositionFingerprintValid(scope, tabNavResume.fingerprint, listenOpts)

      if (!fingerprintValid && frame < TAB_NAV_RESTORE_MAX_FRAMES) {
        requestAnimationFrame(() => runTabNavRestore(frame + 1))
        return
      }

      startReadingResumeRestoreRef.current(
        tabNavResume.anchorId,
        tabNavResume.plainOffset,
        tabNavResume.fingerprint,
        () => {
          settle()
        }
      )
    }

    requestAnimationFrame(() => runTabNavRestore(0))

    return () => {
      cancelled = true
    }
  }, [isHydrated, sectionCount, profileSlug])

  // Precise bookmark resume (session) or automatic reading position when no competing deep link
  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug) return

    let cancelled = false

    const timer = window.setTimeout(() => {
      void (async () => {
        await hydrateGospelClientStorage()
        if (cancelled || profileReadingNavAppliedRef.current) return
        if (studyRefParam) {
          profileReadingNavAppliedRef.current = true
          return
        }

        const rawHash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
        if (rawHash && rawHash.startsWith('section-')) {
          profileReadingNavAppliedRef.current = true
          return
        }

        if (isMcheyneProfileSlug(profileSlug)) {
          if (resolveMcheynePlanDayFromNavigation(mcheynePlanDayParam) != null) {
            profileReadingNavAppliedRef.current = true
            return
          }
          if (resolveMcheyneResumePinFromNavigation(mcheyneResumePinParam)) {
            profileReadingNavAppliedRef.current = true
            return
          }
        }

        const pending = consumePendingBookmarkResume()
        if (pending) {
          profileReadingNavAppliedRef.current = true
          startReadingResumeRestore(
            pending.anchorId,
            pending.plainOffset,
            pending.fingerprint
          )
          return
        }

        const saved = loadProfileReadingResume(profileSlug)
        if (!saved) {
          profileReadingNavAppliedRef.current = true
          return
        }

        const scope = resolveReadingScope(saved.anchorId)
        const listenOpts = listenTextOptionsForProfileSlug(profileSlug)
        if (scope && !isReadingPositionFingerprintValid(scope, saved.fingerprint, listenOpts)) {
          clearProfileReadingResume(profileSlug)
          profileReadingNavAppliedRef.current = true
          return
        }

        profileReadingNavAppliedRef.current = true
        startReadingResumeRestore(saved.anchorId, saved.plainOffset, saved.fingerprint)
      })()
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cancelReadingResumeRestore()
    }
  }, [
    isHydrated,
    sectionCount,
    profileSlug,
    studyRefParam,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    startReadingResumeRestore,
    cancelReadingResumeRestore,
  ])

  // Study library By scripture: scroll to first subsection matching ?studyRef=
  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug || !studyRefParam || !sections) return

    const anchor = findFirstStudyPassageAnchor(sections, studyRefParam)
    if (!anchor) return

    return scrollToTocAnchorWhenReady(anchor.subsectionId, { behavior: 'auto' })
  }, [isHydrated, sectionCount, profileSlug, studyRefParam, sections])

  const clearMcheyneNavQueryParams = useCallback(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    router.replace(`${pathname}${hash}`, { scroll: false })
  }, [router, pathname])

  const finishMcheyneResumeScroll = useCallback(() => {
    finishMcheyneResumeScrollSession(mcheyneResumeScrollCancelRef)
    clearMcheyneNavQueryParams()
  }, [clearMcheyneNavQueryParams])

  const startMcheyneResumeScrollToYellowPin = useCallback(
    (subsectionId: string): void => {
      const daySubsectionId = mcheyneDaySubsectionIdFromAnchor(subsectionId)
      mcheyneResumePinScrollRef.current = true
      startMcheyneResumeScroll(
        mcheyneResumeScrollCancelRef,
        scrollToTocAnchorWhenReady(daySubsectionId, {
          behavior: 'auto',
          maxFrames: 180,
          preferSubsectionTitle: true,
          onDone: finishMcheyneResumeScroll,
          onGiveUp: finishMcheyneResumeScroll,
        })
      )
    },
    [finishMcheyneResumeScroll]
  )

  const scrollToMcheynePlanDay = useCallback(
    (planDay: number, sectionList: GospelSectionType[]) => {
      const anchor = findMcheyneDayAnchor(sectionList, planDay)
      if (!anchor) return null
      return scrollToTocAnchorWhenReady(anchor.subsectionId, {
        behavior: 'auto',
        maxFrames: 180,
        preferSubsectionTitle: true,
        onDone: clearMcheyneNavQueryParams,
        onGiveUp: clearMcheyneNavQueryParams,
      })
    },
    [clearMcheyneNavQueryParams]
  )

  const navigateMcheynePlanDay = useCallback(
    (planDay: number) => {
      const onMchy = Boolean(profileSlug && isMcheyneProfileSlug(profileSlug))
      mcheynePlanDayScrollRef.current = null
      cancelMcheyneResumeScroll(mcheyneResumeScrollCancelRef)
      mcheyneResumePinScrollRef.current = false
      setPendingMcheynePlanDay(planDay)
      if (onMchy) {
        router.replace(`/mchy?planDay=${planDay}`, { scroll: false })
        return
      }
      router.push(`/mchy?planDay=${planDay}`, { scroll: false })
    },
    [profileSlug, router]
  )

  const navigateMcheyneLatest = useCallback(() => {
    mcheynePlanDayScrollRef.current = null
    cancelMcheyneResumeScroll(mcheyneResumeScrollCancelRef)
    mcheyneResumePinScrollRef.current = false

    void (async () => {
      if (!profileSlug) return
      const yellow = await loadMcheyneYellowPinForResume()
      if (!yellow) return

      if (isMcheyneProfileSlug(profileSlug)) {
        bumpVersePins()
        startMcheyneResumeScrollToYellowPin(yellow.subsectionId)
        return
      }

      setPendingMcheyneResumePin()
      router.push('/mchy?resumePin=1', { scroll: false })
    })()
  }, [profileSlug, bumpVersePins, router, startMcheyneResumeScrollToYellowPin])

  // M'Cheyne: ?planDay=N or ?resumePin=1 from Resources calendar modal (not on every open)
  useEffect(() => {
    if (!isHydrated || sectionCount === 0 || !profileSlug || !isMcheyneProfileSlug(profileSlug)) {
      return
    }
    if (studyRefParam) return
    const rawHash = window.location.hash.slice(1)
    if (rawHash && rawHash.startsWith('section-')) return

    const wantsResumePin = resolveMcheyneResumePinFromNavigation(mcheyneResumePinParam)
    if (wantsResumePin) {
      if (mcheyneResumePinScrollRef.current) return
      mcheyneResumePinScrollRef.current = true
      let cancelled = false
      let scrollStarted = false

      void (async () => {
        const yellow = await loadMcheyneYellowPinForResume()
        if (cancelled) {
          mcheyneResumePinScrollRef.current = false
          return
        }
        bumpVersePins()
        if (!yellow) {
          mcheyneResumePinScrollRef.current = false
          clearMcheyneNavQueryParams()
          return
        }
        startMcheyneResumeScrollToYellowPin(yellow.subsectionId)
        scrollStarted = true
        if (cancelled) {
          cancelMcheyneResumeScroll(mcheyneResumeScrollCancelRef)
          scrollStarted = false
          mcheyneResumePinScrollRef.current = false
        }
      })()

      return () => {
        cancelled = true
        // Same intent as plan-day scroll: do not cancel when the effect re-runs while
        // resume scroll is in flight (deps flicker / Strict Mode remount).
        if (scrollStarted) return
        mcheyneResumePinScrollRef.current = false
      }
    }

    if (!wantsResumePin) {
      mcheyneResumePinScrollRef.current = false
    }
    const planDay = resolveMcheynePlanDayFromNavigation(mcheynePlanDayParam)
    if (planDay == null || !sections) {
      mcheynePlanDayScrollRef.current = null
      return
    }
    if (mcheynePlanDayScrollRef.current === planDay) return
    mcheynePlanDayScrollRef.current = planDay

    const cancelScroll = scrollToMcheynePlanDay(planDay, sections)
    if (cancelScroll == null) {
      clearMcheyneNavQueryParams()
      return
    }
    // Do not cancel when the effect re-runs for the same plan day (deps flicker); that
    // aborted scroll before the anchor mounted and left the page at January.
    return () => {
      if (mcheynePlanDayScrollRef.current === planDay) return
      cancelScroll()
    }
  }, [
    isHydrated,
    sectionCount,
    profileSlug,
    studyRefParam,
    sections,
    mcheynePlanDayParam,
    mcheyneResumePinParam,
    bumpVersePins,
    clearMcheyneNavQueryParams,
    scrollToMcheynePlanDay,
    startMcheyneResumeScrollToYellowPin,
  ])

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

      bumpHighlights()
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
  }, [isHydrated, profileInfo?.slug, profileInfo?.title, bumpHighlights])

  const [modalPinUserOverride, setModalPinUserOverride] = useState<{
    key: string
    color: VerseBookmarkColorId
  } | null>(null)

  /** Anchors for navigation + pin commit (matches the passage row in the modal). */
  const [modalOpenAnchors, setModalOpenAnchors] = useState<{
    reference: string
    sectionId: string
    subsectionId: string
  } | null>(null)

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
        const pinned = modalOpenAnchors
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
        setModalOpenAnchors({ reference, sectionId, subsectionId })
      } else {
        setModalOpenAnchors({
          reference,
          sectionId: 'modal-view',
          subsectionId: 'modal-view',
        })
      }
    },
    [sections, modalOpenAnchors]
  )

  const handleRemoveVersePin = useCallback(
    (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => {
      const s = profileInfo?.slug
      if (!s) return
      if (pin.bookmarkId != null && pin.bookmarkId !== '') {
        removeVersePin(s, { kind: 'bookmark', bookmarkId: pin.bookmarkId })
      } else {
        removeVersePin(s, { kind: 'yellow' })
      }
      bumpVersePins()
    },
    [profileInfo?.slug, bumpVersePins]
  )

  const handleClearAllVersePins = useCallback(() => {
    const s = profileInfo?.slug
    if (!s) return
    clearAllVersePins(s)
    bumpVersePins()
  }, [profileInfo?.slug, bumpVersePins])

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
      bumpHighlights()
      setActiveHighlightId((cur) => (cur === highlightId ? null : cur))
    },
    [showConfirm, bumpHighlights]
  )

  const favoriteReferences = useMemo(() => {
    if (!sections) return []
    const favorites: string[] = []
    sections.forEach((section) => {
      section.subsections.forEach((subsection) => {
        if (subsection.scriptureReferences) {
          subsection.scriptureReferences.forEach((ref) => {
            if (ref.favorite) favorites.push(ref.reference)
          })
        }
        if (subsection.nestedSubsections) {
          subsection.nestedSubsections.forEach((nested) => {
            if (nested.scriptureReferences) {
              nested.scriptureReferences.forEach((ref) => {
                if (ref.favorite) favorites.push(ref.reference)
              })
            }
          })
        }
      })
    })
    logger.debug('📖 Found', favorites.length, 'favorite scripture references:', favorites)
    return favorites
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

    if (!allowVisitTracking) return
    // Only track visits for actual profile slugs (not admin pages)
    if (profileInfo && profileInfo.slug && profileInfo.slug !== 'admin') {
      trackVisit()
    }
  }, [profileInfo, allowVisitTracking])

  // All scripture *cards* in profile order, with DOM anchors (duplicate references = separate entries).
  const allScriptureRefs: ScriptureRefNav[] = useMemo(
    () =>
      sections
        ? sections.flatMap((section) => {
            const sid = `section-${section.section}`
            return section.subsections.flatMap((subsection, subIndex) => {
              const subId = `${sid}-${subIndex}`
              const sectionTitle = stripHtmlTags(section.title ?? '').trim()
              const parentSubTitle = stripHtmlTags(subsection.title ?? '').trim()
              const main: ScriptureRefNav[] = (subsection.scriptureReferences || []).map((ref) => ({
                reference: ref.reference,
                sectionId: sid,
                subsectionId: subId,
                sectionTitle,
                subsectionTitle: parentSubTitle,
              }))
              const nested: ScriptureRefNav[] = (subsection.nestedSubsections || []).flatMap((nested, n) => {
                const nestedId = `${sid}-${subIndex}-${n}`
                const nestedTitle = stripHtmlTags(nested.title ?? '').trim()
                return (nested.scriptureReferences || []).map((ref) => ({
                  reference: ref.reference,
                  sectionId: sid,
                  subsectionId: nestedId,
                  sectionTitle,
                  subsectionTitle: parentSubTitle,
                  nestedSubsectionTitle: nestedTitle,
                }))
              })
              return [...main, ...nested]
            })
          })
        : [],
    [sections]
  )

  /** Keep swipe / ◀ ▶ aligned when the modal reference changes (e.g. M'Cheyne Listen day playlist). */
  const syncNavIndexForReference = useCallback(
    (reference: string, explicit?: { sectionId: string; subsectionId: string }) => {
      syncModalAnchorsForNav(reference, explicit)
      let sectionId = explicit?.sectionId?.trim() ?? ''
      let subsectionId = explicit?.subsectionId?.trim() ?? ''
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
              r =>
                r.reference === reference &&
                r.sectionId === sectionId &&
                r.subsectionId === subsectionId
            )
          : undefined
      if (favoriteReferences.length > 0) {
        const favIndex = favoriteReferences.indexOf(reference)
        if (favIndex !== -1) setCurrentReferenceIndex(favIndex)
      } else {
        const allIndex = navEntry
          ? allScriptureRefs.indexOf(navEntry)
          : allScriptureRefs.findIndex(r => r.reference === reference)
        if (allIndex !== -1) setCurrentReferenceIndex(allIndex)
      }
    },
    [sections, allScriptureRefs, favoriteReferences, syncModalAnchorsForNav]
  )

  const handleScriptureClick = useCallback(
    (
      reference: string,
      anchorSectionId?: string,
      anchorSubsectionId?: string,
      options?: { initialChapterView?: boolean; pickerNavigation?: boolean }
    ) => {
      persistReadingResumeBeforeLeave('scripture-open')

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
              r =>
                r.reference === reference &&
                r.sectionId === sectionId &&
                r.subsectionId === subsectionId
            )
          : undefined

      if (sectionId && subsectionId) {
        setModalOpenAnchors({ reference, sectionId, subsectionId })
      } else {
        setModalOpenAnchors({
          reference,
          sectionId: 'modal-view',
          subsectionId: 'modal-view',
        })
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
        ...(options?.initialChapterView || isChapterOnlyScriptureReference(reference)
          ? { initialChapterView: true }
          : {}),
        ...(options?.pickerNavigation ? { pickerNavigation: true as const } : {}),
      })
    },
    [sections, allScriptureRefs, favoriteReferences, persistReadingResumeBeforeLeave]
  )

  const deepLinkTranslation = useMemo((): BibleTranslation | null => {
    if (!translationParam || !isBibleTranslation(translationParam)) return null
    return translationParam
  }, [translationParam])

  const scriptureFromDeepLink = useMemo((): ScriptureModalState | null => {
    if (!isHydrated || sectionCount === 0 || !profileSlug || !scriptureRefParam) return null
    if (dismissedScriptureRefParam === scriptureRefParam) return null
    if (deepLinkTranslation && translationsLoading) return null
    return {
      reference: scriptureRefParam,
      isOpen: true,
      ...(scriptureViewParam === 'chapter' || isChapterOnlyScriptureReference(scriptureRefParam)
        ? { initialChapterView: true }
        : {}),
    }
  }, [
    isHydrated,
    sectionCount,
    profileSlug,
    scriptureRefParam,
    scriptureViewParam,
    dismissedScriptureRefParam,
    deepLinkTranslation,
    translationsLoading,
  ])

  const activeScripture =
    selectedScripture.isOpen ? selectedScripture : (scriptureFromDeepLink ?? selectedScripture)

  const deepLinkModalAnchors = useMemo(() => {
    if (!scriptureRefParam || !sections) return null
    const found = findFirstScriptureCardAnchors(sections, scriptureRefParam)
    if (found) {
      return {
        reference: scriptureRefParam,
        sectionId: found.sectionId,
        subsectionId: found.subsectionId,
      }
    }
    return {
      reference: scriptureRefParam,
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
    }
  }, [scriptureRefParam, sections])

  const effectiveModalOpenAnchors = useMemo(() => {
    if (
      selectedScripture.isOpen &&
      modalOpenAnchors?.reference === selectedScripture.reference
    ) {
      return modalOpenAnchors
    }
    if (scriptureFromDeepLink && deepLinkModalAnchors) {
      return deepLinkModalAnchors
    }
    return modalOpenAnchors
  }, [
    selectedScripture.isOpen,
    selectedScripture.reference,
    modalOpenAnchors,
    scriptureFromDeepLink,
    deepLinkModalAnchors,
  ])

  useEffect(() => {
    if (!profileSlug || !activeScripture.isOpen) return
    const reference = activeScripture.reference.trim()
    if (!reference) return

    const anchorsMatch =
      effectiveModalOpenAnchors?.reference.trim() === reference
    let sectionId = anchorsMatch ? (effectiveModalOpenAnchors?.sectionId?.trim() ?? '') : ''
    let subsectionId = anchorsMatch
      ? (effectiveModalOpenAnchors?.subsectionId?.trim() ?? '')
      : ''
    if (!sectionId || !subsectionId) {
      const found = sections ? findFirstScriptureCardAnchors(sections, reference) : null
      if (found) {
        sectionId = found.sectionId
        subsectionId = found.subsectionId
      } else {
        sectionId = 'modal-view'
        subsectionId = 'modal-view'
      }
    }

    const chapterView =
      activeScripture.initialChapterView === true ||
      isChapterOnlyScriptureReference(reference)

    recordScriptureLastOpen({
      slug: profileSlug,
      profileTitle: profileInfo?.title ?? profileSlug,
      reference,
      sectionId,
      subsectionId,
      ...(chapterView ? { chapterView: true } : {}),
      translation,
    })
  }, [
    activeScripture.isOpen,
    activeScripture.reference,
    activeScripture.initialChapterView,
    profileSlug,
    profileInfo?.title,
    effectiveModalOpenAnchors,
    sections,
    translation,
  ])

  const mcheyneDayListenSubsectionId = effectiveModalOpenAnchors?.subsectionId?.trim() || ''

  const mcheyneDayListenReferences = useMemo(() => {
    if (!profileSlug || !isMcheyneProfileSlug(profileSlug)) return undefined
    if (!mcheyneDayListenSubsectionId) return undefined
    return mcheyneDayChapterReferencesForAnchor(mcheyneDayListenSubsectionId) ?? undefined
  }, [profileSlug, mcheyneDayListenSubsectionId])

  const deepLinkNavIndex = useMemo(() => {
    if (!scriptureFromDeepLink) return null
    const reference = scriptureRefParam
    if (favoriteReferences.length > 0) {
      const favIndex = favoriteReferences.indexOf(reference)
      if (favIndex !== -1) return favIndex
    }
    const allIndex = allScriptureRefs.findIndex((r) => r.reference === reference)
    return allIndex !== -1 ? allIndex : null
  }, [scriptureFromDeepLink, scriptureRefParam, favoriteReferences, allScriptureRefs])

  const navReferenceIndex =
    selectedScripture.isOpen || deepLinkNavIndex === null
      ? currentReferenceIndex
      : deepLinkNavIndex

  useEffect(() => {
    if (!scriptureFromDeepLink || !deepLinkTranslation) return
    if (!enabledTranslations.includes(deepLinkTranslation)) return
    const token = `${scriptureRefParam}|${deepLinkTranslation}`
    if (deepLinkTranslationAppliedRef.current === token) return
    deepLinkTranslationAppliedRef.current = token
    void setTranslation(deepLinkTranslation)
  }, [
    scriptureFromDeepLink,
    deepLinkTranslation,
    enabledTranslations,
    scriptureRefParam,
    setTranslation,
  ])

  const navListLength =
    favoriteReferences.length > 0 ? favoriteReferences.length : allScriptureRefs.length
  
  const navigatePickerPassage = useCallback((direction: 'prev' | 'next') => {
    const ref = activeScripture.reference.trim()
    if (!ref) return
    const adjacent = adjacentPickerPassage(ref, direction)
    if (!adjacent) return
    setModalOpenAnchors({
      reference: adjacent.reference,
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
    })
    setSelectedScripture({
      reference: adjacent.reference,
      isOpen: true,
      pickerNavigation: true,
      ...(adjacent.initialChapterView ? { initialChapterView: true as const } : {}),
    })
  }, [activeScripture.reference])

  // Navigation functions for favorite references or all references if no favorites
  const navigateToPrevious = useCallback(() => {
    if (activeScripture.pickerNavigation) {
      navigatePickerPassage('prev')
      return
    }
    if (navListLength === 0) return

    if (favoriteReferences.length > 0) {
      const newIndex = (navReferenceIndex - 1 + navListLength) % navListLength
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

    const newIndex = (navReferenceIndex - 1 + allScriptureRefs.length) % allScriptureRefs.length
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
    activeScripture.pickerNavigation,
    favoriteReferences,
    navListLength,
    navReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
    navigatePickerPassage,
  ])

  const navigateToNext = useCallback(() => {
    if (activeScripture.pickerNavigation) {
      navigatePickerPassage('next')
      return
    }
    if (navListLength === 0) return

    if (favoriteReferences.length > 0) {
      const newIndex = (navReferenceIndex + 1) % navListLength
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

    const newIndex = (navReferenceIndex + 1) % allScriptureRefs.length
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
    activeScripture.pickerNavigation,
    favoriteReferences,
    navListLength,
    navReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
    navigatePickerPassage,
  ])

  const pickerNavRef = activeScripture.isOpen ? activeScripture.reference.trim() : ''
  const hasPrevious = activeScripture.pickerNavigation
    ? pickerPassageHasPrevious(pickerNavRef)
    : navListLength > 1
  const hasNext = activeScripture.pickerNavigation
    ? pickerPassageHasNext(pickerNavRef)
    : navListLength > 1

  useEffect(() => {
    if (!activeScripture.isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateToPrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateToNext()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeScripture.isOpen, navigateToPrevious, navigateToNext])

  const modalPassageAnchorsForPins: VersePinSlotEntry | null = useMemo(() => {
    if (!activeScripture.isOpen || !activeScripture.reference.trim()) return null
    const refStr = activeScripture.reference
    const snap = effectiveModalOpenAnchors
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
  }, [activeScripture.isOpen, activeScripture.reference, sections, effectiveModalOpenAnchors])

  const modalPinSyncedKey =
    activeScripture.isOpen && modalPassageAnchorsForPins?.reference
      ? `${modalPassageAnchorsForPins.reference}|${modalPassageAnchorsForPins.sectionId}|${modalPassageAnchorsForPins.subsectionId}`
      : null

  const defaultModalPinColor = useMemo((): VersePinColorId => {
    if (!modalPassageAnchorsForPins?.reference) return 'yellow'
    return versePinColorForPassage(versePinMap, modalPassageAnchorsForPins) ?? 'yellow'
  }, [modalPassageAnchorsForPins, versePinMap])

  const modalPinDraftColor: VersePinColorId =
    modalPinSyncedKey && modalPinUserOverride?.key === modalPinSyncedKey
      ? modalPinUserOverride.color
      : defaultModalPinColor

  const modalPinDropdownColors = useMemo(
    () =>
      modalPassageAnchorsForPins
        ? availablePinColorsForModalChoice(versePinMap, modalPassageAnchorsForPins)
        : [],
    [versePinMap, modalPassageAnchorsForPins]
  )

  /** “Where you are” in the profile when the scripture modal is open (pinned anchors + nav index). */
  const scriptureModalPresentationLocation = useMemo(() => {
    if (!activeScripture.isOpen) return undefined
    const refStr = activeScripture.reference.trim()
    if (!refStr) return undefined
    const snap = effectiveModalOpenAnchors
    if (!snap || snap.reference !== refStr) return undefined
    if (
      snap.sectionId === 'modal-view' ||
      snap.subsectionId === 'modal-view' ||
      !snap.sectionId?.trim() ||
      !snap.subsectionId?.trim()
    ) {
      return undefined
    }
    const entry = allScriptureRefs.find(
      (r) =>
        r.reference === refStr &&
        r.sectionId === snap.sectionId &&
        r.subsectionId === snap.subsectionId
    )
    if (entry) {
      return {
        sectionTitle: entry.sectionTitle,
        subsectionTitle: entry.subsectionTitle,
        ...(entry.nestedSubsectionTitle
          ? { nestedSubsectionTitle: entry.nestedSubsectionTitle }
          : {}),
      }
    }

    return (
      presentationLocationFromProfileAnchors(sections, snap.sectionId, snap.subsectionId) ??
      undefined
    )
  }, [
    activeScripture.isOpen,
    activeScripture.reference,
    allScriptureRefs,
    sections,
    effectiveModalOpenAnchors,
  ])

  const persistVersePinForModalPassage = useCallback(
    (refTxt: string) => {
      if (!refTxt || !profileInfo?.slug) return
      const snap = effectiveModalOpenAnchors
      let sectionId = snap?.reference === refTxt ? (snap.sectionId?.trim() ?? '') : ''
      let subsectionId = snap?.reference === refTxt ? (snap.subsectionId?.trim() ?? '') : ''
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
      const bookmarkTint =
        isVerseBookmarkColorId(modalPinDraftColor) &&
        modalPinDraftColor !== defaultModalPinColor
          ? modalPinDraftColor
          : null

      if (bookmarkTint) {
        assignVersePin(profileInfo.slug, bookmarkTint, entry)
        bumpVersePins()
      } else if (shouldAdvanceYellowLastViewed(versePinMap, entry)) {
        assignYellowLastViewed(profileInfo.slug, entry)
        bumpVersePins()
      }
    },
    [
      profileInfo,
      effectiveModalOpenAnchors,
      sections,
      modalPinDraftColor,
      defaultModalPinColor,
      versePinMap,
      bumpVersePins,
    ]
  )

  const lastPersistedModalPinKeyRef = useRef<string | null>(null)
  /** Bookmark tint chosen in the picker but not yet written — flushed when leaving that passage. */
  const pendingBookmarkOverrideByPinKeyRef = useRef<Map<string, VerseBookmarkColorId>>(new Map())

  const flushPendingBookmarkOverrideForPinKey = useCallback(
    (pinKey: string) => {
      if (!profileInfo?.slug) return
      const color = pendingBookmarkOverrideByPinKeyRef.current.get(pinKey)
      if (!color) return
      const entry = versePinSlotEntryFromModalPinKey(pinKey)
      if (!entry) return
      assignVersePin(profileInfo.slug, color, entry)
      pendingBookmarkOverrideByPinKeyRef.current.delete(pinKey)
      bumpVersePins()
    },
    [profileInfo, bumpVersePins]
  )

  useEffect(() => {
    if (!modalPinSyncedKey || !modalPinUserOverride) return
    if (modalPinUserOverride.key !== modalPinSyncedKey) return
    if (
      !isVerseBookmarkColorId(modalPinUserOverride.color) ||
      modalPinUserOverride.color === defaultModalPinColor
    ) {
      pendingBookmarkOverrideByPinKeyRef.current.delete(modalPinSyncedKey)
      return
    }
    pendingBookmarkOverrideByPinKeyRef.current.set(
      modalPinSyncedKey,
      modalPinUserOverride.color
    )
  }, [modalPinUserOverride, modalPinSyncedKey, defaultModalPinColor])

  /** Pin yellow (or chosen tint) as soon as the open passage changes — not only on modal close. */
  useEffect(() => {
    if (!activeScripture.isOpen) {
      lastPersistedModalPinKeyRef.current = null
      pendingBookmarkOverrideByPinKeyRef.current.clear()
      return
    }
    const anchors = modalPassageAnchorsForPins
    if (!anchors?.reference.trim()) return
    const pinKey = `${anchors.reference}|${anchors.sectionId}|${anchors.subsectionId}`
    if (lastPersistedModalPinKeyRef.current === pinKey) return
    const previousPinKey = lastPersistedModalPinKeyRef.current
    if (previousPinKey) {
      flushPendingBookmarkOverrideForPinKey(previousPinKey)
    }
    lastPersistedModalPinKeyRef.current = pinKey
    persistVersePinForModalPassage(anchors.reference.trim())
  }, [
    activeScripture.isOpen,
    modalPassageAnchorsForPins,
    persistVersePinForModalPassage,
    flushPendingBookmarkOverrideForPinKey,
  ])

  const closeModal = () => {
    persistVersePinForModalPassage(activeScripture.reference.trim())
    pendingBookmarkOverrideByPinKeyRef.current.clear()
    setModalPinUserOverride(null)
    setModalOpenAnchors(null)
    if (scriptureFromDeepLink && scriptureRefParam) {
      setDismissedScriptureRefParam(scriptureRefParam)
    }
    setSelectedScripture({ reference: '', isOpen: false })
  }

  const openScriptureFromTabEntry = useCallback(
    (entry: ProfileRecentScriptureEntry) => {
      // Do not await setTranslation: state updates synchronously, but await waits on API
      // sync while the passage reference is still the previous tab — recordScriptureModalTab
      // would persist the wrong translation on the tab being left.
      if (
        entry.translation &&
        isBibleTranslation(entry.translation) &&
        enabledTranslations.includes(entry.translation)
      ) {
        void setTranslation(entry.translation)
      }
      if (entry.slug.trim() !== profileSlug.trim()) {
        router.push(buildProfileRecentScriptureHref(entry))
        return
      }
      const wantChapterView =
        entry.chapterView === true || isChapterOnlyScriptureReference(entry.reference)
      syncNavIndexForReference(entry.reference, {
        sectionId: entry.sectionId,
        subsectionId: entry.subsectionId,
      })
      setModalOpenAnchors({
        reference: entry.reference,
        sectionId: entry.sectionId,
        subsectionId: entry.subsectionId,
      })
      setSelectedScripture({
        reference: entry.reference,
        isOpen: true,
        initialChapterView: wantChapterView,
      })
    },
    [profileSlug, router, enabledTranslations, setTranslation, syncNavIndexForReference]
  )

  const scripturePinCommitOnUnmountRef = useRef<{
    isOpen: boolean
    reference: string
    commit: (ref: string) => void
  }>({
    isOpen: false,
    reference: '',
    commit: () => {},
  })

  useEffect(() => {
    scripturePinCommitOnUnmountRef.current = {
      isOpen: activeScripture.isOpen,
      reference: activeScripture.reference,
      commit: persistVersePinForModalPassage,
    }
  }, [activeScripture.isOpen, activeScripture.reference, persistVersePinForModalPassage])

  useEffect(() => {
    return () => {
      const snap = scripturePinCommitOnUnmountRef.current
      if (snap.isOpen && snap.reference.trim()) {
        snap.commit(snap.reference.trim())
      }
    }
  }, [profileSlug])

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

  const handleShareResource = async () => {
    if (typeof window === 'undefined' || !profileInfo?.slug) return
    const slug = profileInfo.slug.replace(/^\/+|\/+$/g, '')
    const url = `${window.location.origin}/${slug}`
    setIsSharingResource(true)
    try {
      const result = await shareResourceUrl({
        url,
        title: profileInfo.title || slug,
        dialogTitle: 'Share presentation',
        text: `Open this gospel presentation: ${profileInfo.title || slug}`,
      })
      if (result === 'copied') {
        showAlert(`Link copied to clipboard:\n\n${url}`)
      }
    } catch (e) {
      logger.error('Share resource failed', e)
      showAlert('Could not share this link. Please try again.')
    } finally {
      setIsSharingResource(false)
    }
  }

  useEffect(() => {
    const onTourCloseMenu = (): void => {
      setIsMenuOpen(false)
    }
    window.addEventListener(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT, onTourCloseMenu)
    return () => window.removeEventListener(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT, onTourCloseMenu)
  }, [])

  usePresentationScrollReadComplete(profileInfo?.slug)

  const presentationMarkedReadComplete = useSyncExternalStore(
    (onStoreChange) => {
      const slug = profileInfo?.slug
      if (!slug || typeof window === 'undefined') return () => {}
      const onStatus = (e: Event) => {
        const ce = e as CustomEvent<{ slug: string; read: boolean }>
        if (ce.detail?.slug === slug) onStoreChange()
      }
      const onStorage = (ev: StorageEvent) => {
        if (ev.key === PRESENTATION_READ_COMPLETE_STORAGE_KEY) onStoreChange()
      }
      window.addEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
        window.removeEventListener('storage', onStorage)
      }
    },
    () => (profileInfo?.slug ? isPresentationReadComplete(profileInfo.slug) : false),
    () => false
  )

  const presentationSlug = profileInfo?.slug
  const handleMarkPresentationUnread = useCallback(() => {
    if (!presentationSlug) return
    removePresentationReadCompleteSlug(presentationSlug)
  }, [presentationSlug])

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
          <div className="w-full min-w-0 px-5 py-3">
            <div className="flex min-w-0 justify-between items-center gap-3">
              <button
                type="button"
                data-tour="profile-menu-button"
                onClick={toggleMenu}
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                title={isMenuOpen ? 'Close menu' : 'Open menu'}
                className={`flex shrink-0 items-center rounded-md transition-colors cursor-pointer bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white ${
                  showMenuLabel
                    ? 'gap-2 px-2.5 py-2 min-h-[40px] min-w-0'
                    : 'justify-center gap-0 p-2 min-h-[36px] min-w-[36px]'
                }`}
              >
                <span className="flex flex-col gap-1" aria-hidden>
                  <span className={`block w-5 h-0.5 bg-slate-800 dark:bg-white transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                  <span className={`block w-5 h-0.5 bg-slate-800 dark:bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block w-5 h-0.5 bg-slate-800 dark:bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </span>
                {showMenuLabel ? (
                  <span className="font-medium" aria-hidden>
                    Menu
                  </span>
                ) : null}
              </button>
              
              {/* Right side content — min-w-0 + overflow so Listen/help/icons stay reachable on narrow viewports */}
              <div
                data-profile-header-toolbar-icons
                className="flex min-w-0 flex-1 justify-end items-center gap-1.5 sm:gap-2.5 overflow-x-auto"
              >
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
                <ProfileHelpMenu profileSlug={profileInfo.slug} profileTitle={profileInfo.title} />
                <ProfileResourceReadAloud sections={sections} profileSlug={profileInfo.slug} />
                <HighlightsDropdown
                  profileSlug={profileInfo.slug}
                  onOpenHighlight={(h) => focusHighlightById(h.id)}
                  onHighlightsChanged={bumpHighlights}
                />
                <BookmarksDropdown
                  sections={sections}
                  profileTitle={profileInfo.title}
                  profileSlug={profileInfo.slug}
                />
                <button
                  type="button"
                  data-tour="profile-share-resource"
                  onClick={handleShareResource}
                  disabled={isSharingResource}
                  aria-label={isSharingResource ? 'Sharing…' : 'Share this resource'}
                  title="Share this resource"
                  className="shrink-0 p-2 rounded-md flex items-center justify-center min-h-[36px] min-w-[36px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15"
                    />
                  </svg>
                </button>
                <ThemeToggle />
              </div>
            </div>
          </div>
          <ProfileResourceTabs
            tabs={resourceTabs}
            activeSlug={profileSlug}
            onSelectTab={handleSelectResourceTab}
            onCloseTab={handleCloseResourceTab}
          />
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
            className="fixed top-[env(safe-area-inset-top,0px)] bottom-0 left-0 z-50 bg-white dark:bg-slate-800 w-80 shadow-2xl overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] scrollbar-none border-r border-gray-200 dark:border-slate-600 transform transition-transform duration-300 ease-in-out print-hide"
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
                onOpenSpurgeonLibrary={(menuTitle) => {
                  setSpurgeonStudyReference(null)
                  setStudyModalTitle(menuTitle ?? STUDY_MODAL_DEFAULT_TITLE)
                  setStudyLibraryFocus('spurgeon')
                  setIsSpurgeonLibraryOpen(true)
                }}
                onOpenMorneveLibrary={() => {
                  setIsMorneveLibraryOpen(true)
                }}
                onOpenMcheynePlan={() => {
                  setIsMcheynePlanModalOpen(true)
                }}
                onOpenCalvinLibrary={(menuTitle) => {
                  setSpurgeonStudyReference(null)
                  setStudyModalTitle(menuTitle ?? STUDY_MODAL_DEFAULT_TITLE)
                  setStudyLibraryFocus('calvin')
                  setIsSpurgeonLibraryOpen(true)
                }}
                onOpenHenryLibrary={(menuTitle) => {
                  setSpurgeonStudyReference(null)
                  setStudyModalTitle(menuTitle ?? STUDY_MODAL_DEFAULT_TITLE)
                  setStudyLibraryFocus('henry')
                  setIsSpurgeonLibraryOpen(true)
                }}
                onOpenEdwardsLibrary={(menuTitle) => {
                  setSpurgeonStudyReference(null)
                  setStudyModalTitle(menuTitle ?? STUDY_MODAL_DEFAULT_TITLE)
                  setStudyLibraryFocus('edwards')
                  setIsSpurgeonLibraryOpen(true)
                }}
                onOpenBibleReader={() => {
                  setBibleReaderOpen(true)
                  closeMenu()
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
                  {presentationMarkedReadComplete ? (
                    <button
                      type="button"
                      onClick={handleMarkPresentationUnread}
                      className="mt-3 w-full cursor-pointer rounded px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                      aria-label="Mark this resource as unread"
                    >
                      Mark this resource as unread
                    </button>
                  ) : null}
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
        reference={activeScripture.reference}
        isOpen={activeScripture.isOpen}
        profileSlug={profileSlug}
        profileTitle={profileInfo?.title ?? profileSlug}
        scriptureTabAnchors={
          effectiveModalOpenAnchors
            ? {
                sectionId: effectiveModalOpenAnchors.sectionId,
                subsectionId: effectiveModalOpenAnchors.subsectionId,
              }
            : undefined
        }
        mcheyneDayChapterReferences={mcheyneDayListenReferences}
        initialChapterView={activeScripture.initialChapterView ?? false}
        onClose={closeModal}
        onScriptureTabActivate={(entry) => {
          void openScriptureFromTabEntry(entry)
        }}
        onScriptureTabCloseActive={(next) => {
          if (!next) {
            closeModal()
            return
          }
          void openScriptureFromTabEntry(next)
        }}
        onNavigateReference={(ref, meta) => {
          const chapterView =
            meta?.initialChapterView === true ||
            (meta?.initialChapterView !== false && isChapterOnlyScriptureReference(ref))
          if (meta?.fromPassagePicker) {
            setModalOpenAnchors({
              reference: ref,
              sectionId: 'modal-view',
              subsectionId: 'modal-view',
            })
          } else {
            syncNavIndexForReference(ref)
          }
          setSelectedScripture((prev) => ({
            ...prev,
            reference: ref,
            isOpen: true,
            ...(chapterView ? { initialChapterView: true as const } : { initialChapterView: undefined }),
            ...(meta?.fromPassagePicker
              ? { pickerNavigation: true as const }
              : prev.pickerNavigation
                ? { pickerNavigation: true as const }
                : { pickerNavigation: undefined }),
          }))
        }}
        onPrevious={hasPrevious ? navigateToPrevious : undefined}
        onNext={hasNext ? navigateToNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        presentationLocation={scriptureModalPresentationLocation}
        versePinControl={{
          draftColor: modalPinDraftColor,
          onDraftColorChange: (color) => {
            if (modalPinSyncedKey && isVerseBookmarkColorId(color)) {
              setModalPinUserOverride({ key: modalPinSyncedKey, color })
            }
          },
          colorsAvailableInDropdown: modalPinDropdownColors,
        }}
        onOpenSpurgeonStudy={(ref) => {
          setStudyModalTitle(STUDY_MODAL_DEFAULT_TITLE)
          setStudyLibraryFocus('all')
          setSpurgeonStudyReference(ref)
          setIsSpurgeonLibraryOpen(true)
        }}
      />

      <SpurgeonSermonsModal
        isOpen={isSpurgeonLibraryOpen}
        modalTitle={studyModalTitle}
        libraryFocus={studyLibraryFocus}
        initialByReference={spurgeonStudyReference}
        onFollowSermonLink={() => {
          closeModal()
          setMemorizationPracticeVerse(null)
        }}
        onClose={() => {
          setIsSpurgeonLibraryOpen(false)
          setSpurgeonStudyReference(null)
          setStudyModalTitle(STUDY_MODAL_DEFAULT_TITLE)
          setStudyLibraryFocus('all')
        }}
      />

      <MorneveDevotionsModal
        isOpen={isMorneveLibraryOpen}
        onFollowDayLink={() => {
          closeModal()
          setMemorizationPracticeVerse(null)
        }}
        onClose={() => setIsMorneveLibraryOpen(false)}
      />

      <McheyneReadingPlanModal
        isOpen={isMcheynePlanModalOpen}
        onNavigateToPlanDay={navigateMcheynePlanDay}
        onNavigateToLatest={navigateMcheyneLatest}
        onFollowDayLink={() => {
          closeModal()
          setMemorizationPracticeVerse(null)
        }}
        onClose={() => setIsMcheynePlanModalOpen(false)}
      />

      {typeof document !== 'undefined' &&
        bibleReaderOpen &&
        createPortal(
          <BiblePassagePickerModal
            isOpen={bibleReaderOpen}
            onClose={() => setBibleReaderOpen(false)}
            confirmLabel="Read"
            requireVerse={false}
            variant="reader"
            onConfirm={(ref, meta) => {
              handleScriptureClick(ref, undefined, undefined, {
                initialChapterView: meta.initialChapterView,
                pickerNavigation: true,
              })
              setBibleReaderOpen(false)
            }}
          />,
          document.body
        )}

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
              setStudyModalTitle(STUDY_MODAL_DEFAULT_TITLE)
              setStudyLibraryFocus('all')
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