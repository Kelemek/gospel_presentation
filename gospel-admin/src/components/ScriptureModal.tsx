'use client'

import {
  useId,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import BiblePassagePickerModal from '@/components/BiblePassagePickerModal'
import { useTranslation, type BibleTranslation } from '@/contexts/TranslationContext'
import { isBibleTranslation } from '@/lib/bible-translations'
import { useTextSize } from '@/contexts/TextSizeContext'
import { useAlertModal } from '@/contexts/AlertModalContext'
import {
  isChapterOnlyScriptureReference,
  scriptureReferenceForPassageQuery,
} from '@/lib/parse-scripture-reference'
import { splitScriptureReferenceForHeader } from '@/lib/splitScriptureReferenceForHeader'
import { formatScriptureApiError } from '@/lib/format-scripture-api-error'
import {
  memorizeAddBookFromReference,
  writeMemorizeAddTestament,
} from '@/lib/memorizationAddVersePrefs'
import { memorizationSaveFailureMessage } from '@/lib/memorizationSaveFailureMessage'
import { logger } from '@/lib/logger'
import { lockDocumentScroll } from '@/lib/documentScrollLock'
import { buildScriptureModalShareUrl } from '@/lib/scriptureModalShareUrl'
import { shareScripturePassage } from '@/lib/shareScripturePassage'
import {
  GOSPEL_MEMORIZATION_CHANGED_EVENT,
  isMemoizedForReference,
  tryAddMemorizedVerse,
} from '@/lib/verseMemorizationStorage'
import type { VerseBookmarkColorId, VersePinColorId } from '@/lib/versePinStorage'
import ScriptureModalPinPick from '@/components/ScriptureModalPinPick'
import ScriptureModalTabs from '@/components/ScriptureModalTabs'
import ScriptureModalToolbarMenu from '@/components/ScriptureModalToolbarMenu'
import ScriptureWordStudyModal from '@/components/ScriptureWordStudyModal'
import ScriptureModalChapterListen from '@/components/ScriptureModalChapterListen'
import ScripturePassageText from '@/components/ScripturePassageText'
import ScripturePassageSwipeLayer from '@/components/ScripturePassageSwipeLayer'
import { usePassageAnchorKey } from '@/hooks/usePassageAnchorKey'
import {
  scriptureModalHeaderCloseButtonClass,
  scriptureModalHeaderIconButtonClass,
} from '@/components/scriptureModalHeaderButtons'
import {
  wordStudyAvailableFromReference,
  wordStudyLanguageLabelFromReference,
} from '@/lib/step-bible-reference'
import type { ScriptureModalPresentationLocation } from '@/lib/presentationLocationFromAnchors'
import { studyResourcesAvailableFromPayload } from '@/lib/studyResourcesAvailability'
import {
  formatScriptureChapterHtml,
  formatScripturePassageHtml,
} from '@/lib/scripturePassageHtml'
import {
  readScriptureShowVerseNumbersFromStorage,
  subscribeScriptureShowVerseNumbers,
  writeScriptureShowVerseNumbersToStorage,
} from '@/lib/scriptureVerseNumbersPreference'
import {
  GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT,
  getScriptureModalTabEntry,
  loadScriptureModalTabs,
  recordScriptureModalTab,
  removeScriptureModalTab,
  resolveScriptureTabNavigationAfterClose,
  scriptureModalTabKey,
  type ProfileRecentScriptureEntry,
  type RecordScriptureLastOpenInput,
} from '@/lib/profileLastOpenResourceStorage'

export type { ScriptureModalPresentationLocation }

const EMPTY_SCRIPTURE_MODAL_TABS: ProfileRecentScriptureEntry[] = []

/** Same 36px row height as prev/next (`scriptureModalHeaderIconButtonClass`). */
const scriptureModalHeaderTitleClass =
  'text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight px-1 min-w-0 flex-1 max-w-full overflow-hidden flex items-center justify-center h-9 min-h-[36px] box-border'

function ScriptureModalHeaderReference({
  book,
  suffix,
}: {
  book: string
  suffix: string
}) {
  if (!suffix) {
    return <span className="min-w-0 truncate">{book}</span>
  }
  return (
    <span className="min-w-0 max-w-full inline-flex items-baseline gap-1 overflow-hidden">
      <span className="truncate">{book}</span>
      <span className="shrink-0 whitespace-nowrap">{suffix}</span>
    </span>
  )
}

type SpurgeonStudyMatch = 'unset' | 'loading' | 'yes' | 'no'

function getVerseNumbers(verseRef: string): number[] {
  const match = verseRef.match(/:(\d+)(?:[-–](\d+))?/)
  if (match) {
    const start = parseInt(match[1])
    const end = match[2] ? parseInt(match[2]) : start
    const verses = []
    for (let i = start; i <= end; i++) {
      verses.push(i)
    }
    return verses
  }
  return []
}

/** Chapter pane scroll-to-top (M'Cheyne cards, etc.) — not when a specific verse should stay centered. */
function shouldResetChapterPaneScrollTop(verseRef: string): boolean {
  const verseNumbers = getVerseNumbers(verseRef)
  return verseNumbers.length === 0 || isChapterOnlyScriptureReference(verseRef)
}

interface ScriptureModalProps {
  reference: string
  isOpen: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  /** When set (e.g. profile presentation), show where this verse sits in the resource. */
  presentationLocation?: ScriptureModalPresentationLocation
  /** When set (e.g. profile presentation), show pin-color icon picker beside Memorize. */
  versePinControl?: {
    draftColor: VersePinColorId
    onDraftColorChange: (value: VersePinColorId) => void
    colorsAvailableInDropdown: readonly VerseBookmarkColorId[]
  }
  /** Opens unified study library modal with “by scripture” search for this reference (profile pages). */
  onOpenSpurgeonStudy?: (reference: string) => void
  /** Navigate the reader to another verse (e.g. concordance link in word study, passage picker). */
  onNavigateReference?: (
    reference: string,
    meta?: { initialChapterView?: boolean; fromPassagePicker?: boolean }
  ) => void
  /** When true (e.g. `?scriptureView=chapter` deep link), load full chapter after open. Chapter-only refs (e.g. `Genesis 1`) also open in chapter view automatically. */
  initialChapterView?: boolean
  /** Profile slug for share deep links (current resource). Omit to share passage text only. */
  profileSlug?: string
  /** Profile title for Scripture modal tab storage. */
  profileTitle?: string
  /** Section anchors for the open passage (modal tab bar). */
  scriptureTabAnchors?: { sectionId: string; subsectionId: string }
  /** Switch to another open passage tab (may navigate to another profile). */
  onScriptureTabActivate?: (entry: ProfileRecentScriptureEntry) => void
  /** After closing the active tab, open `next` or close the modal when null. */
  onScriptureTabCloseActive?: (next: ProfileRecentScriptureEntry | null) => void
  /** M'Cheyne: four chapter refs for the open day (Family + Secret); Listen plays all in order. */
  mcheyneDayChapterReferences?: readonly string[]
}

export default function ScriptureModal({ 
  reference, 
  isOpen, 
  onClose, 
  onPrevious, 
  onNext, 
  hasPrevious = false, 
  hasNext = false,
  presentationLocation,
  versePinControl,
  onOpenSpurgeonStudy,
  onNavigateReference,
  initialChapterView = false,
  profileSlug,
  profileTitle,
  scriptureTabAnchors,
  onScriptureTabActivate,
  onScriptureTabCloseActive,
  mcheyneDayChapterReferences,
}: ScriptureModalProps) {
  const { translation, setTranslation, enabledTranslations, enabledTranslationOptions } =
    useTranslation()
  const { textSize } = useTextSize()
  const { showAlert, showConfirm } = useAlertModal()
  const [chapterView, setChapterView] = useState<{ sessionKey: string; text: string } | null>(null)
  const [chapterContextError, setChapterContextError] = useState<{
    sessionKey: string
    error: string
  } | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const passageScopeRef = useRef<HTMLDivElement>(null)
  const verseTabButtonRef = useRef<HTMLButtonElement>(null)
  const initialChapterViewFetchedRef = useRef(false)
  const scriptureModalTitleId = useId()

  const scriptureTabUiKey = useMemo(() => {
    const slug = profileSlug?.trim()
    const ref = reference.trim()
    if (!slug || !ref) return null
    return scriptureModalTabKey({ slug, reference: ref })
  }, [profileSlug, reference])

  const storedTabCompareTranslation = useMemo((): string | null => {
    if (!onScriptureTabActivate || !profileSlug?.trim()) return null
    const stored = getScriptureModalTabEntry(profileSlug.trim(), reference)
    const storedCompare = stored?.compareTranslation
    if (
      storedCompare &&
      isBibleTranslation(storedCompare) &&
      storedCompare !== translation &&
      enabledTranslations.includes(storedCompare)
    ) {
      return storedCompare
    }
    return null
  }, [onScriptureTabActivate, profileSlug, reference, translation, enabledTranslations])

  // Compare translation (second column); in-memory override per tab, else restored from tab storage.
  const [compareByTabKey, setCompareByTabKey] = useState<{
    tabKey: string | null
    value: string | null
  }>({ tabKey: null, value: null })

  const compareTranslation =
    scriptureTabUiKey === null || compareByTabKey.tabKey === scriptureTabUiKey
      ? compareByTabKey.value
      : storedTabCompareTranslation

  const setCompareTranslation = useCallback(
    (value: string | null) => {
      setCompareByTabKey({ tabKey: scriptureTabUiKey, value })
    },
    [scriptureTabUiKey]
  )
  const [wordStudyEnabled, setWordStudyEnabled] = useState(false)
  const [memorizeInFlight, setMemorizeInFlight] = useState(false)
  const [shareInFlight, setShareInFlight] = useState(false)
  const [passagePickerOpen, setPassagePickerOpen] = useState(false)

  const [scriptureResolved, setScriptureResolved] = useState<{
    key: string
    text: string
    error: string
  } | null>(null)

  const [compareVerseResolved, setCompareVerseResolved] = useState<{
    key: string
    text: string
    error: string
  } | null>(null)

  const [compareChapterResolved, setCompareChapterResolved] = useState<{
    key: string
    text: string
  } | null>(null)

  /** Latest spurgeon-links result for a specific reference (set only in fetch callbacks). */
  const [spurgeonStudyResolved, setSpurgeonStudyResolved] = useState<{
    ref: string
    match: 'yes' | 'no'
  } | null>(null)

  const spurgeonStudyLookupRef = useMemo(() => {
    if (!isOpen || !onOpenSpurgeonStudy || !reference.trim()) return null
    return reference.trim()
  }, [isOpen, onOpenSpurgeonStudy, reference])

  const spurgeonStudyMatch = useMemo((): SpurgeonStudyMatch => {
    if (!spurgeonStudyLookupRef) return 'unset'
    if (!spurgeonStudyResolved || spurgeonStudyResolved.ref !== spurgeonStudyLookupRef) {
      return 'loading'
    }
    return spurgeonStudyResolved.match
  }, [spurgeonStudyLookupRef, spurgeonStudyResolved])

  /** Tailwind `sm` is 640px — match for toolbar wrapping on phones. */
  const narrowSmViewport = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {}
      }
      const mq = window.matchMedia('(max-width: 639px)')
      mq.addEventListener('change', onStoreChange)
      return () => mq.removeEventListener('change', onStoreChange)
    },
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 639px)').matches
        : false,
    () => false
  )

  const verseViewSessionKey = useMemo(() => {
    if (!isOpen || !reference.trim()) return null
    return `${reference.trim()}|${translation}`
  }, [isOpen, reference, translation])

  const preferChapterView = useMemo(
    () => initialChapterView || isChapterOnlyScriptureReference(reference),
    [initialChapterView, reference]
  )

  const wordStudyAvailable = useMemo(
    () => wordStudyAvailableFromReference(reference),
    [reference]
  )

  const wordStudyLanguageLabel = useMemo(
    () => wordStudyLanguageLabelFromReference(reference),
    [reference]
  )

  const scriptureFetchKey = verseViewSessionKey

  const activeCompareTranslation = useMemo((): BibleTranslation | null => {
    if (!compareTranslation || compareTranslation === translation) return null
    if (!isBibleTranslation(compareTranslation)) return null
    if (!enabledTranslations.includes(compareTranslation)) return null
    return compareTranslation
  }, [compareTranslation, translation, enabledTranslations])

  const compareVerseFetchKey = useMemo(() => {
    if (!scriptureFetchKey || !activeCompareTranslation) return null
    return `${scriptureFetchKey}|${activeCompareTranslation}`
  }, [scriptureFetchKey, activeCompareTranslation])

  const compareChapterFetchKey = useMemo(() => {
    if (!compareVerseFetchKey || !chapterView || chapterView.sessionKey !== verseViewSessionKey) {
      return null
    }
    return `${compareVerseFetchKey}|chapter`
  }, [compareVerseFetchKey, chapterView, verseViewSessionKey])

  const isMemoized = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(GOSPEL_MEMORIZATION_CHANGED_EVENT, onStoreChange)
      return () => window.removeEventListener(GOSPEL_MEMORIZATION_CHANGED_EVENT, onStoreChange)
    },
    () => isMemoizedForReference(reference, translation),
    () => false
  )

  const showVerseNumbers = useSyncExternalStore(
    subscribeScriptureShowVerseNumbers,
    readScriptureShowVerseNumbersFromStorage,
    () => true
  )

  const handlePassageLongPress = useCallback(async () => {
    const confirmed = await showConfirm(
      showVerseNumbers
        ? 'Hide verse numbers in the scripture reader?'
        : 'Show verse numbers in the scripture reader?'
    )
    if (confirmed) {
      writeScriptureShowVerseNumbersToStorage(!showVerseNumbers)
    }
  }, [showConfirm, showVerseNumbers])

  const processChapterText = useCallback(
    (text: string): string =>
      formatScriptureChapterHtml(text, {
        showVerseNumbers,
        highlightVerses: getVerseNumbers(reference),
      }),
    [reference, showVerseNumbers]
  )

  const formatPassageText = useCallback(
    (text: string): string => formatScripturePassageHtml(text, { showVerseNumbers }),
    [showVerseNumbers]
  )

  const loading =
    scriptureFetchKey !== null &&
    (scriptureResolved === null || scriptureResolved.key !== scriptureFetchKey)

  const scriptureText =
    scriptureResolved?.key === scriptureFetchKey ? scriptureResolved.text : ''

  const error = scriptureResolved?.key === scriptureFetchKey ? scriptureResolved.error : ''

  const chapterError =
    chapterContextError?.sessionKey === verseViewSessionKey ? chapterContextError.error : ''

  const showingContext =
    verseViewSessionKey !== null &&
    chapterView !== null &&
    chapterView.sessionKey === verseViewSessionKey &&
    chapterView.text.length > 0

  const chapterText = showingContext ? chapterView.text : ''

  const scriptureTabInput = useMemo((): RecordScriptureLastOpenInput | undefined => {
    const slug = profileSlug?.trim()
    if (!slug || !reference.trim()) return undefined
    return {
      slug,
      profileTitle: profileTitle ?? slug,
      reference,
      sectionId: scriptureTabAnchors?.sectionId ?? 'modal-view',
      subsectionId: scriptureTabAnchors?.subsectionId ?? 'modal-view',
      chapterView: showingContext,
      translation,
      compareTranslation: activeCompareTranslation ?? null,
    }
  }, [
    profileSlug,
    profileTitle,
    reference,
    scriptureTabAnchors?.sectionId,
    scriptureTabAnchors?.subsectionId,
    showingContext,
    translation,
    activeCompareTranslation,
  ])

  const [scriptureTabsRevision, setScriptureTabsRevision] = useState(0)

  useEffect(() => {
    if (!isOpen || !onScriptureTabActivate) return
    const bump = () => setScriptureTabsRevision((n) => n + 1)
    window.addEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, bump)
    return () => {
      window.removeEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, bump)
    }
  }, [isOpen, onScriptureTabActivate])

  const scriptureModalTabs = useMemo(() => {
    void scriptureTabsRevision
    if (!isOpen || !onScriptureTabActivate) return EMPTY_SCRIPTURE_MODAL_TABS
    return loadScriptureModalTabs(scriptureTabInput)
  }, [isOpen, onScriptureTabActivate, scriptureTabInput, scriptureTabsRevision])

  useEffect(() => {
    if (!isOpen || !scriptureTabInput) return
    recordScriptureModalTab(scriptureTabInput)
  }, [isOpen, scriptureTabInput])

  const prevScriptureTabUiKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isOpen || !onScriptureTabActivate || !scriptureTabUiKey) return
    if (prevScriptureTabUiKeyRef.current === scriptureTabUiKey) return
    prevScriptureTabUiKeyRef.current = scriptureTabUiKey

    setChapterView(null)
    setChapterContextError(null)
    setCompareVerseResolved(null)
    setCompareChapterResolved(null)
    initialChapterViewFetchedRef.current = false
  }, [isOpen, onScriptureTabActivate, scriptureTabUiKey])

  useEffect(() => {
    if (!isOpen) {
      prevScriptureTabUiKeyRef.current = null
    }
  }, [isOpen])

  const handleScriptureTabClose = useCallback(
    (entry: ProfileRecentScriptureEntry) => {
      const slug = profileSlug?.trim() ?? ''
      const isActive =
        scriptureModalTabKey(entry) === scriptureModalTabKey({ slug, reference })
      const next = isActive
        ? resolveScriptureTabNavigationAfterClose(entry.slug, entry.reference)
        : null
      removeScriptureModalTab(entry.slug, entry.reference)
      if (isActive) {
        onScriptureTabCloseActive?.(next)
      }
    },
    [profileSlug, reference, onScriptureTabCloseActive]
  )

  const handleScriptureTabSelect = useCallback(
    (entry: ProfileRecentScriptureEntry) => {
      if (scriptureTabInput) {
        recordScriptureModalTab(scriptureTabInput)
      }
      onScriptureTabActivate?.(entry)
    },
    [scriptureTabInput, onScriptureTabActivate]
  )

  const isMcheyneDayPlaylist =
    translation === 'esv' &&
    mcheyneDayChapterReferences != null &&
    mcheyneDayChapterReferences.length > 1

  /** ESV passage audio (Crossway): verse-level in verse view, chapter-level in chapter view; M'Cheyne day playlist uses chapters. */
  const showScriptureListen =
    translation === 'esv' &&
    (isMcheyneDayPlaylist ||
      (showingContext && chapterText.length > 0 && !contextLoading) ||
      (!showingContext && scriptureText.length > 0 && !loading))

  const compareLoading =
    compareVerseFetchKey !== null &&
    (compareVerseResolved === null || compareVerseResolved.key !== compareVerseFetchKey)

  const compareText =
    compareVerseResolved?.key === compareVerseFetchKey ? compareVerseResolved.text : ''

  const compareError =
    compareVerseResolved?.key === compareVerseFetchKey ? compareVerseResolved.error : ''

  const compareChapterText =
    compareChapterResolved?.key === compareChapterFetchKey ? compareChapterResolved.text : ''

  /** Larger profile text bumps root rem; fixed px widths keep row1 (Compare / Translation / Pin) on one line. */
  const compactScriptureToolbarForMobileLargeText =
    narrowSmViewport && (textSize === 'larger' || textSize === 'largest')

  const scriptureCompareMenuTriggerClassName = compactScriptureToolbarForMobileLargeText
    ? 'w-[128px] max-w-[128px] shrink-0 !px-1.5'
    : undefined

  const scriptureTranslationMenuTriggerClassName = compactScriptureToolbarForMobileLargeText
    ? 'w-[84px] max-w-[84px] shrink-0 !px-1.5'
    : undefined

  /** Slightly smaller labels so Verse / Chapter / Memorize / Study stay on one row on narrow phones. */
  const scriptureToolbarControlTextClass = 'text-xs font-medium leading-none'

  /** Verse ↔ chapter toggle: fixed width so label does not shift (Chapter / Verse / Loading…). */
  const verseChapterToggleWidthClass = 'w-[88px] min-w-[88px] max-w-[88px] shrink-0'

  /** Active toolbar control (Chapter/Verse toggle, Words when open). */
  const scriptureToolbarActiveClass =
    'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-100 border-blue-500 dark:border-blue-400'

  const compareMenuOptions = useMemo(
    () => [
      { value: '', label: 'Compare' },
      ...enabledTranslations
        .filter((trans) => trans !== translation)
        .map((trans) => ({ value: trans, label: trans.toUpperCase() })),
    ],
    [enabledTranslations, translation]
  )

  const translationMenuOptions = useMemo(
    () => enabledTranslations.map((trans) => ({ value: trans, label: trans.toUpperCase() })),
    [enabledTranslations]
  )

  // Extract chapter reference from verse reference
  const getChapterReference = (verseRef: string): string => {
    const match = verseRef.match(/^(.+?)\s+(\d+)(?::\d+)?(?:-\d+)?/)
    if (match) {
      return `${match[1]} ${match[2]}`
    }
    return verseRef
  }

  const passageAudioReference = scriptureReferenceForPassageQuery(
    showingContext ? getChapterReference(reference) : reference.trim()
  )

  const fetchChapterContext = useCallback(async () => {
    if (!verseViewSessionKey) return
    const chapterRef = getChapterReference(reference)
    const sessionKey = verseViewSessionKey
    setContextLoading(true)
    setChapterContextError(null)

    try {
      const response = await fetch(
        `/api/scripture?reference=${encodeURIComponent(chapterRef)}&translation=${translation}`,
        { cache: 'no-store' }
      )
      const data = await response.json()

      const errMsg = formatScriptureApiError(data)
      if (errMsg) {
        setChapterView(null)
        setChapterContextError({ sessionKey, error: errMsg })
      } else {
        setChapterView({ sessionKey, text: typeof data.text === 'string' ? data.text : '' })
        setChapterContextError(null)
      }
    } catch {
      setChapterView(null)
      setChapterContextError({
        sessionKey,
        error: 'Failed to load chapter context',
      })
    } finally {
      setContextLoading(false)
    }
  }, [verseViewSessionKey, reference, translation])

  useEffect(() => {
    initialChapterViewFetchedRef.current = false
  }, [verseViewSessionKey])

  useEffect(() => {
    if (!isOpen) {
      initialChapterViewFetchedRef.current = false
      return
    }
    if (
      !preferChapterView ||
      showingContext ||
      contextLoading ||
      initialChapterViewFetchedRef.current ||
      !verseViewSessionKey
    ) {
      return
    }
    initialChapterViewFetchedRef.current = true
    void fetchChapterContext()
  }, [
    isOpen,
    preferChapterView,
    showingContext,
    contextLoading,
    verseViewSessionKey,
    fetchChapterContext,
  ])

  const resetScriptureModalScrollTop = useCallback(() => {
    const pane = scrollAreaRef.current
    if (pane) pane.scrollTop = 0
  }, [])

  /** After layout paints (chapter HTML, compare columns, etc.), keep the reader at the top. */
  const scheduleScriptureModalScrollTop = useCallback(() => {
    resetScriptureModalScrollTop()
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      resetScriptureModalScrollTop()
      raf2 = window.requestAnimationFrame(resetScriptureModalScrollTop)
    })
    const t = window.setTimeout(resetScriptureModalScrollTop, 150)
    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
      window.clearTimeout(t)
    }
  }, [resetScriptureModalScrollTop])

  /** Verse content first: scroll to top and move focus to Verse (not toolbar controls like Study). */
  useEffect(() => {
    if (!isOpen) return
    const skipScrollTop = !shouldResetChapterPaneScrollTop(reference)
    const cancelScroll = skipScrollTop ? undefined : scheduleScriptureModalScrollTop()
    const id = window.requestAnimationFrame(() => {
      verseTabButtonRef.current?.focus({ preventScroll: true })
    })
    return () => {
      cancelScroll?.()
      window.cancelAnimationFrame(id)
    }
  }, [isOpen, reference, scheduleScriptureModalScrollTop])

  /** Chapter view (incl. M'Cheyne chapter cards): reset when chapter HTML mounts — skip when a verse should be auto-scrolled. */
  useEffect(() => {
    if (!isOpen || !showingContext || !chapterText) return
    if (!shouldResetChapterPaneScrollTop(reference)) return
    return scheduleScriptureModalScrollTop()
  }, [isOpen, showingContext, chapterText, reference, scheduleScriptureModalScrollTop])

  /** Verse-only view: reset when passage text replaces the loading spinner (not while chapter context is active or loading). */
  useEffect(() => {
    if (!isOpen || showingContext || loading || !scriptureText) return
    if (preferChapterView || chapterView !== null) return
    return scheduleScriptureModalScrollTop()
  }, [
    isOpen,
    showingContext,
    loading,
    scriptureText,
    reference,
    preferChapterView,
    chapterView,
    scheduleScriptureModalScrollTop,
  ])

  useEffect(() => {
    if (!spurgeonStudyLookupRef) return
    const ref = spurgeonStudyLookupRef
    let cancelled = false
    void fetch(`/api/scripture/spurgeon-links?reference=${encodeURIComponent(ref)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => ({}))
        if (cancelled) return
        const payload = data as {
          items?: unknown
          sermonCount?: number
          edwardsCount?: number
          morneveCount?: number
          calvinCount?: number
          henryCount?: number
          bookCount?: number
          crossRefCount?: number
        }
        const list = Array.isArray(payload.items) ? payload.items : []
        setSpurgeonStudyResolved({
          ref,
          match: studyResourcesAvailableFromPayload({ ...payload, items: list }) ? 'yes' : 'no',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSpurgeonStudyResolved({ ref, match: 'no' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [spurgeonStudyLookupRef])

  // Lock document scroll without jumping the profile page to the top (overflow-only locks do).
  useLayoutEffect(() => {
    if (!isOpen) return
    return lockDocumentScroll()
  }, [isOpen])

  // Auto-scroll to highlighted verse when chapter context is displayed (scroll the modal pane, not the window)
  useEffect(() => {
    if (!showingContext || !chapterText) return

    if (shouldResetChapterPaneScrollTop(reference)) {
      return scheduleScriptureModalScrollTop()
    }

    const verseNumbers = getVerseNumbers(reference)

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth'

    let elementId = ''
    if (verseNumbers.length > 1) {
      const lastVerse = verseNumbers[verseNumbers.length - 1]
      elementId = `verse-range-${verseNumbers[0]}-${lastVerse}`
    } else {
      elementId = `verse-${verseNumbers[0]}`
    }

    const scrollHighlightedIntoPane = (): void => {
      const pane = scrollAreaRef.current
      const highlightedElement = document.getElementById(elementId)
      if (!pane || !highlightedElement) return
      const paneRect = pane.getBoundingClientRect()
      const verseRect = highlightedElement.getBoundingClientRect()
      const delta =
        verseRect.top - paneRect.top - paneRect.height / 2 + verseRect.height / 2
      pane.scrollBy({ top: delta, behavior })
    }

    let cancelled = false
    const run = (): void => {
      if (!cancelled) scrollHighlightedIntoPane()
    }

    const t0 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run)
    })
    const t1 = window.setTimeout(run, 120)
    const t2 = window.setTimeout(run, 400)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(t0)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [showingContext, chapterText, reference, scheduleScriptureModalScrollTop])

  useEffect(() => {
    if (!scriptureFetchKey) return

    const key = scriptureFetchKey
    const abortController = new AbortController()

    void fetch(
      `/api/scripture?reference=${encodeURIComponent(reference)}&translation=${translation}`,
      { signal: abortController.signal, cache: 'no-store' }
    )
      .then((response) => response.json())
      .then((data) => {
        const errMsg = formatScriptureApiError(data)
        if (errMsg) {
          setScriptureResolved({ key, text: '', error: errMsg })
        } else {
          setScriptureResolved({
            key,
            text: typeof data.text === 'string' ? data.text : '',
            error: '',
          })
        }
      })
      .catch((err: { name?: string }) => {
        if (err.name !== 'AbortError') {
          setScriptureResolved({ key, text: '', error: 'Failed to load scripture text' })
        }
      })

    return () => abortController.abort()
  }, [scriptureFetchKey, reference, translation])

  useEffect(() => {
    if (!compareVerseFetchKey) return

    const key = compareVerseFetchKey
    const compareTrans = activeCompareTranslation
    if (!compareTrans) return

    const abortController = new AbortController()

    void fetch(
      `/api/scripture?reference=${encodeURIComponent(reference)}&translation=${compareTrans}`,
      { signal: abortController.signal, cache: 'no-store' }
    )
      .then((response) => response.json())
      .then((data) => {
        const errMsg = formatScriptureApiError(data)
        if (errMsg) {
          setCompareVerseResolved({ key, text: '', error: errMsg })
        } else {
          setCompareVerseResolved({
            key,
            text: typeof data.text === 'string' ? data.text : '',
            error: '',
          })
        }
      })
      .catch((err: { name?: string }) => {
        if (err.name !== 'AbortError') {
          setCompareVerseResolved({ key, text: '', error: 'Failed to load compare text' })
        }
      })

    return () => abortController.abort()
  }, [compareVerseFetchKey, reference, activeCompareTranslation])

  useEffect(() => {
    if (!compareChapterFetchKey) return

    const key = compareChapterFetchKey
    const compareTrans = activeCompareTranslation
    if (!compareTrans) return

    const abortController = new AbortController()
    const chapterRef = getChapterReference(reference)

    void fetch(
      `/api/scripture?reference=${encodeURIComponent(chapterRef)}&translation=${compareTrans}`,
      { signal: abortController.signal, cache: 'no-store' }
    )
      .then((response) => response.json())
      .then((data) => {
        if (!formatScriptureApiError(data)) {
          setCompareChapterResolved({
            key,
            text: typeof data.text === 'string' ? data.text : '',
          })
        }
      })
      .catch(() => {})

    return () => abortController.abort()
  }, [compareChapterFetchKey, reference, activeCompareTranslation])

  const translationLabel = useMemo(() => {
    const match = enabledTranslationOptions.find((o) => o.translation_code === translation)
    return match?.translation_name ?? translation.toUpperCase()
  }, [enabledTranslationOptions, translation])

  const shareablePassageText = showingContext ? chapterText : scriptureText
  const shareDisabled =
    shareInFlight ||
    loading ||
    contextLoading ||
    !!error ||
    !(shareablePassageText ?? '').trim()

  /** Share primary translation column only (not compare), verse or chapter as shown. */
  const handleSharePassage = async () => {
    if (shareDisabled) return

    const shareRef = showingContext ? getChapterReference(reference) : reference
    const raw = showingContext ? chapterText : scriptureText

    const shareSlug = profileSlug?.trim().replace(/^\/+|\/+$/g, '') ?? ''
    const pageUrl =
      shareSlug && typeof window !== 'undefined'
        ? buildScriptureModalShareUrl({
            origin: window.location.origin,
            profileSlug: shareSlug,
            reference: shareRef,
            translation,
            scriptureView: showingContext ? 'chapter' : undefined,
          })
        : undefined

    setShareInFlight(true)
    try {
      const result = await shareScripturePassage({
        reference: shareRef,
        translationLabel,
        passageText: raw,
        pageUrl,
        dialogTitle: 'Share passage',
      })
      if (result === 'copied') {
        showAlert('Passage copied to clipboard')
      }
    } catch (e) {
      logger.error('Share scripture passage failed', e)
      showAlert('Could not share this passage. Please try again.')
    } finally {
      setShareInFlight(false)
    }
  }

  const handleMemorize = async () => {
    if (memorizeInFlight || isMemoized) return

    const text = scriptureText ?? ''
    if (loading) {
      showAlert('Still loading this passage. Wait a moment, then tap Memorize again.')
      return
    }
    if (error) {
      showAlert('This passage could not be loaded. Fix the error above, then try again.')
      return
    }
    if (!text.trim()) {
      showAlert('No verse text is available to save yet.')
      return
    }

    setMemorizeInFlight(true)
    try {
      const result = await tryAddMemorizedVerse(reference, text, translation)
      if (result.ok) {
        const book = memorizeAddBookFromReference(reference)
        if (book) writeMemorizeAddTestament(book.testament)
        showAlert(
          'Added to memorization list.\n\nYou can find this verse under Memorize in the menu.'
        )
      } else {
        showAlert(memorizationSaveFailureMessage(result.reason))
      }
    } finally {
      setMemorizeInFlight(false)
    }
  }

  const handleClose = () => {
    setChapterView(null)
    setChapterContextError(null)
    setWordStudyEnabled(false)
    onClose()
  }

  const closeWordStudy = useCallback(() => {
    setWordStudyEnabled(false)
  }, [])

  const isComparing = !!activeCompareTranslation

  const passageSwipeContentReady = useMemo(() => {
    if (error) return false
    if (isComparing) {
      if (compareError) return false
      if (showingContext) return !!chapterText && !!compareChapterText
      return !!scriptureText && !!compareText
    }
    if (showingContext) return !!chapterText
    return !!scriptureText
  }, [
    error,
    isComparing,
    compareError,
    showingContext,
    chapterText,
    compareChapterText,
    scriptureText,
    compareText,
  ])

  const passageSwipeContentKey = useMemo(
    () =>
      `${reference}|${showingContext ? 'chapter' : 'verse'}|${translation}|${compareTranslation ?? ''}`,
    [reference, showingContext, translation, compareTranslation]
  )

  const passageSwipeLoading =
    loading || contextLoading || (isComparing && compareLoading)

  const anchoredPassageKey = usePassageAnchorKey(
    isOpen,
    passageSwipeContentReady,
    passageSwipeContentKey
  )

  const isPassageReload =
    passageSwipeLoading &&
    !passageSwipeContentReady &&
    anchoredPassageKey !== null &&
    anchoredPassageKey !== passageSwipeContentKey

  const showPassageSwipeLayer = passageSwipeContentReady || isPassageReload

  const showInitialPassageLoading =
    passageSwipeLoading && !passageSwipeContentReady && !showPassageSwipeLayer

  if (!isOpen) return null

  const { book: headerBook, referenceSuffix: headerSuffix } =
    splitScriptureReferenceForHeader(reference)

  const renderAttribution = (trans: string) => {
    if (trans === 'esv') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission.{' '}
          <a href="https://www.esv.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            www.esv.org
          </a>
        </p>
      )
    }
    if (trans === 'kjv') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations are from the King James Version (KJV), which is in the public domain.
        </p>
      )
    }
    if (trans === 'nasb') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations taken from the New American Standard Bible® (NASB), Copyright © 1960, 1962, 1963, 1968, 1971, 1972, 1973, 1975, 1977, 1995 by The Lockman Foundation. Used by permission.{' '}
          <a href="https://www.lockman.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            www.lockman.org
          </a>
        </p>
      )
    }
    if (trans === 'lsb') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Legacy Standard Bible Copyright ©2021 by The Lockman Foundation. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">LSBible.org</a>
          {' '}For Permission to Quote Information visit{' '}
          <a href="https://www.LSBible.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">www.LSBible.org</a>
        </p>
      )
    }
    if (trans === 'niv') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations taken from THE HOLY BIBLE, NEW INTERNATIONAL VERSION®, NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission.{' '}
          <a href="https://www.biblica.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            Biblica.com
          </a>
        </p>
      )
    }
    if (trans === 'nlt') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc.{' '}
          <a href="https://www.tyndale.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            Tyndale.com
          </a>
        </p>
      )
    }
    if (trans === 'csb') {
      return (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Scripture quotations taken from the Christian Standard Bible®, Copyright © 2017 by Holman Bible Publishers. Used by permission.{' '}
          <a href="https://csbible.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">
            CSBible.com
          </a>
        </p>
      )
    }
    return null
  }

  const passageSwipeNavProps = {
    canGoNext: hasNext,
    canGoPrevious: hasPrevious,
    onNext,
    onPrevious,
    disabled: !!error || (isComparing && !!compareError),
    contentReady: passageSwipeContentReady,
    contentKey: passageSwipeContentKey,
  }

  return (
    <>
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 z-50 flex items-start lg:items-center justify-center p-0 lg:p-4"
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full lg:max-w-2xl xl:max-w-4xl 2xl:max-w-5xl shadow-xl flex flex-col h-full lg:h-[80vh] lg:rounded-lg min-h-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby={scriptureModalTitleId}
      >
        
        {/* Fixed Header with Controls - Always Visible */}
        {/* Top safe area is on the full-screen overlay only; do not repeat here (doubles inset in Capacitor/iOS). */}
        <div
          className="bg-slate-100 dark:bg-slate-700 px-4 pt-2 pb-2 border-b dark:border-slate-600 shrink-0 relative z-20 overflow-visible lg:rounded-t-lg"
          data-tour="scripture-modal-toolbar"
        >
          {/* Navigation Controls - Always at Top */}
          <div className="flex items-center gap-1.5 min-w-0 mb-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
              <span data-scripture-modal-chrome className="shrink-0 inline-flex">
              <button
                type="button"
                data-tour="scripture-modal-prev"
                onClick={() => {
                  if (hasPrevious && onPrevious) {
                    onPrevious()
                  }
                }}
                disabled={!hasPrevious}
                className={scriptureModalHeaderIconButtonClass}
                title="Previous Scripture"
                aria-label="Previous Scripture"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              </span>
              {onNavigateReference ? (
                <button
                  type="button"
                  id={scriptureModalTitleId}
                  data-tour="scripture-modal-reference-picker"
                  onClick={() => setPassagePickerOpen(true)}
                  className={`${scriptureModalHeaderTitleClass} cursor-pointer rounded-md hover:bg-slate-200/80 dark:hover:bg-slate-600/80 active:bg-slate-300/80 dark:active:bg-slate-500/80 transition-colors`}
                  title={`${reference} — choose another passage`}
                  aria-label={`${reference}. Choose another passage`}
                >
                  <ScriptureModalHeaderReference book={headerBook} suffix={headerSuffix} />
                </button>
              ) : (
                <h3
                  id={scriptureModalTitleId}
                  className={scriptureModalHeaderTitleClass}
                  title={reference}
                  aria-label={reference}
                >
                  <ScriptureModalHeaderReference book={headerBook} suffix={headerSuffix} />
                </h3>
              )}
              <span data-scripture-modal-chrome className="shrink-0 inline-flex">
              <button
                type="button"
                data-tour="scripture-modal-next"
                onClick={() => {
                  if (hasNext && onNext) {
                    onNext()
                  }
                }}
                disabled={!hasNext}
                className={scriptureModalHeaderIconButtonClass}
                title="Next Scripture"
                aria-label="Next Scripture"
              >
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              </span>
            </div>
            <div
              data-scripture-modal-chrome
              className="flex shrink-0 items-center gap-1.5"
            >
              <ScriptureModalChapterListen
                passageReference={passageAudioReference}
                chapterReference={getChapterReference(reference)}
                translation={translation}
                enabled={showScriptureListen}
                dayChapterReferences={mcheyneDayChapterReferences}
                onPlaylistChapterChange={
                  isMcheyneDayPlaylist ? onNavigateReference : undefined
                }
                hasNext={hasNext}
                onNext={onNext}
                passageScopeRef={passageScopeRef}
                scrollContainerRef={scrollAreaRef}
                passageScopeKey={passageSwipeContentKey}
              />
              <button
                type="button"
                data-tour="scripture-modal-share"
                onClick={() => {
                  void handleSharePassage()
                }}
                disabled={shareDisabled}
                aria-label={shareInFlight ? 'Sharing…' : 'Share passage'}
                title="Share passage"
                className={scriptureModalHeaderIconButtonClass}
              >
                <svg
                  className="w-5 h-5 shrink-0"
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
              <button
                type="button"
                data-tour="scripture-modal-close"
                onClick={handleClose}
                className={scriptureModalHeaderCloseButtonClass}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
          </div>
          
          {/* Toolbar: row1 = Compare + Translation + pin; row2 = verse/chapter toggle + Memorize (+ Study) */}
          <div
            data-scripture-modal-chrome
            className="flex flex-wrap gap-1 justify-center items-center overflow-visible"
          >
            <div className="w-full sm:w-auto flex flex-wrap gap-1 justify-center sm:justify-start items-center overflow-visible">
              {/* Compare menu — custom listbox to match pin control styling (no native select). */}
              <ScriptureModalToolbarMenu
                dataTour="scripture-modal-compare"
                listboxDataTour="scripture-modal-compare-listbox"
                ariaLabel="Compare with another translation"
                listboxAriaLabel="Compare with a translation"
                triggerClassName={scriptureCompareMenuTriggerClassName}
                triggerLabelClassName={scriptureToolbarControlTextClass}
                portaledListbox
                value={compareTranslation ?? ''}
                options={compareMenuOptions}
                onSelect={(val) => {
                  setCompareTranslation(val === '' ? null : val)
                }}
              />

              <ScriptureModalToolbarMenu
                dataTour="scripture-modal-translation"
                ariaLabel="Select Bible translation"
                listboxAriaLabel="Bible translation"
                triggerClassName={scriptureTranslationMenuTriggerClassName}
                triggerLabelClassName={scriptureToolbarControlTextClass}
                portaledListbox
                value={translation}
                options={translationMenuOptions}
                onSelect={async (val) => {
                  await setTranslation(val as BibleTranslation)
                  setChapterView(null)
                  setChapterContextError(null)
                  if (compareTranslation === val) {
                    setCompareTranslation(null)
                  }
                }}
              />
              {versePinControl && (
                <ScriptureModalPinPick
                  reference={reference}
                  draftColor={versePinControl.draftColor}
                  onDraftColorChange={versePinControl.onDraftColorChange}
                  colorsAvailableInDropdown={versePinControl.colorsAvailableInDropdown}
                  disabled={loading || !!error || !reference.trim()}
                />
              )}
            </div>

            <div className="w-full sm:w-auto flex flex-wrap gap-1 justify-center sm:justify-start items-center">
              <button
                ref={verseTabButtonRef}
                type="button"
                data-tour="scripture-modal-verse-chapter-toggle"
                onClick={() => {
                  if (showingContext) {
                    setChapterView(null)
                    setChapterContextError(null)
                  } else {
                    setWordStudyEnabled(false)
                    void fetchChapterContext()
                  }
                }}
                disabled={!showingContext && contextLoading}
                title={
                  showingContext
                    ? 'Return to this passage (verse view)'
                    : contextLoading
                      ? undefined
                      : 'View the whole chapter with your verses highlighted'
                }
                aria-label={
                  contextLoading
                    ? 'Loading chapter context'
                    : showingContext
                      ? 'Verse'
                      : 'Chapter context'
                }
                className={`${verseChapterToggleWidthClass} px-2 h-9 min-h-[36px] box-border inline-flex items-center justify-center ${scriptureToolbarControlTextClass} rounded-md transition-colors border-2 ${scriptureToolbarActiveClass} ${
                  !showingContext && contextLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {contextLoading && !showingContext ? 'Loading...' : showingContext ? 'Verse' : 'Chapter'}
              </button>

              <button
                type="button"
                data-tour="scripture-modal-word-study"
                onClick={() => setWordStudyEnabled((v) => !v)}
                disabled={!wordStudyAvailable || showingContext}
                title={
                  showingContext
                    ? 'Word study is available for a single verse'
                    : !wordStudyAvailable
                      ? 'Word study requires a verse reference'
                      : wordStudyEnabled
                        ? `Close ${wordStudyLanguageLabel ?? 'word'} study`
                        : `Open ${wordStudyLanguageLabel ?? 'word'} study (STEP Bible)`
                }
                aria-label={
                  wordStudyEnabled
                    ? `Close ${wordStudyLanguageLabel ?? 'word'} study`
                    : `Open ${wordStudyLanguageLabel ?? 'word'} study`
                }
                aria-pressed={wordStudyEnabled}
                className={`px-1.5 h-9 min-h-[36px] box-border inline-flex items-center justify-center ${scriptureToolbarControlTextClass} rounded-md transition-colors border-2 shrink-0 ${
                  !wordStudyAvailable || showingContext
                    ? 'text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-700/50'
                    : wordStudyEnabled
                      ? `cursor-pointer ${scriptureToolbarActiveClass}`
                      : 'cursor-pointer text-slate-700 dark:text-slate-200 border-slate-400 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {wordStudyLanguageLabel ?? 'Words'}
              </button>

              {onOpenSpurgeonStudy && (
                <button
                  type="button"
                  data-tour="scripture-modal-spurgeon-study"
                  disabled={
                    !reference.trim() ||
                    spurgeonStudyMatch === 'loading' ||
                    spurgeonStudyMatch === 'unset' ||
                    spurgeonStudyMatch === 'no'
                  }
                  onClick={() => {
                    const ref = reference.trim()
                    if (!ref || spurgeonStudyMatch !== 'yes') return
                    onOpenSpurgeonStudy(ref)
                  }}
                  title={
                    !reference.trim()
                      ? 'Open a passage to search study resources'
                      : spurgeonStudyMatch === 'loading' || spurgeonStudyMatch === 'unset'
                        ? 'Checking indexed study resources…'
                        : spurgeonStudyMatch === 'no'
                          ? 'No indexed study resources or cross references for this passage'
                          : 'Search cross references, Spurgeon, devotions, Calvin, Matthew Henry, and indexed books for this passage'
                  }
                  aria-label={
                    !reference.trim()
                      ? 'Study: no passage selected'
                      : spurgeonStudyMatch === 'loading' || spurgeonStudyMatch === 'unset'
                        ? 'Study: checking indexed resources'
                        : spurgeonStudyMatch === 'no'
                          ? 'Study: no indexed resources or cross references for this passage'
                          : 'Study: cross references and indexed resources for this passage'
                  }
                  className={`px-1.5 h-9 min-h-[36px] box-border inline-flex items-center justify-center ${scriptureToolbarControlTextClass} rounded-md transition-colors border-2 shrink-0 ${
                    !reference.trim() ||
                    spurgeonStudyMatch === 'loading' ||
                    spurgeonStudyMatch === 'unset' ||
                    spurgeonStudyMatch === 'no'
                      ? 'text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-700/50'
                      : 'cursor-pointer text-slate-700 dark:text-slate-200 border-slate-400 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500'
                  }`}
                >
                  Study
                </button>
              )}

              <button
                type="button"
                data-tour="scripture-modal-memorize"
                onClick={() => {
                  void handleMemorize()
                }}
                disabled={isMemoized || memorizeInFlight}
                aria-busy={memorizeInFlight}
                title={
                  isMemoized
                    ? 'Already in memorization list'
                    : memorizeInFlight
                      ? 'Saving to memorization list…'
                      : loading
                        ? 'Loading passage…'
                        : error
                          ? 'Passage failed to load'
                          : !(scriptureText ?? '').trim()
                            ? 'No verse text loaded yet'
                            : 'Save this verse to memorize later'
                }
                aria-label={
                  isMemoized
                    ? 'Verse already in memorization list'
                    : memorizeInFlight
                      ? 'Saving verse to memorization list'
                      : 'Memorize this verse'
                }
                className={`px-1.5 h-9 min-h-[36px] box-border inline-flex items-center justify-center ${scriptureToolbarControlTextClass} rounded-md transition-colors border-2 shrink-0 ${
                  isMemoized || memorizeInFlight
                    ? 'text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-600 cursor-not-allowed bg-slate-50 dark:bg-slate-700/50'
                    : 'cursor-pointer text-slate-700 dark:text-slate-200 border-slate-400 dark:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 active:bg-slate-300 dark:active:bg-slate-500'
                }`}
              >
                {memorizeInFlight ? 'Memorizing…' : 'Memorize'}
              </button>
            </div>
          </div>
        </div>

        {profileSlug?.trim() && onScriptureTabActivate ? (
          <ScriptureModalTabs
            tabs={scriptureModalTabs}
            activeSlug={profileSlug.trim()}
            activeReference={reference}
            onSelectTab={handleScriptureTabSelect}
            onCloseTab={handleScriptureTabClose}
          />
        ) : null}

        {presentationLocation && (
          <div
            className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 shrink-0 min-w-0"
            data-tour="scripture-modal-context"
            data-testid="scripture-modal-presentation-location"
            aria-label="Where you are in this presentation"
          >
            <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100 truncate min-w-0">
              {presentationLocation.sectionTitle}
            </p>
            {presentationLocation.subsectionTitle.trim() ? (
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 truncate min-w-0 pl-3 mt-0.5 border-l-2 border-slate-300 dark:border-slate-500">
                {presentationLocation.subsectionTitle}
              </p>
            ) : null}
            {presentationLocation.nestedSubsectionTitle?.trim() ? (
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 truncate min-w-0 pl-6 mt-0.5 border-l-2 border-slate-300 dark:border-slate-500">
                {presentationLocation.nestedSubsectionTitle}
              </p>
            ) : null}
          </div>
        )}

        {/* Scrollable content + horizontal swipe (whole pane, including attribution) */}
        <ScripturePassageSwipeLayer
          className="relative z-0 flex-1 min-h-0 flex flex-col"
          onLongPress={handlePassageLongPress}
          {...passageSwipeNavProps}
        >
          <div
            ref={scrollAreaRef}
            className="relative flex-1 overflow-y-auto touch-pan-y px-4 py-4 min-h-0"
            data-tour={isComparing ? 'scripture-modal-compare-columns' : 'scripture-modal-scroll-area'}
          >
            {isComparing ? (
              <>
                {compareError && (
                  <div className="text-red-600 text-center py-8">
                    <p className="mb-2 text-base md:text-lg">⚠️ {compareError}</p>
                  </div>
                )}
                {error && (
                  <div className="text-red-600 text-center py-8">
                    <p className="mb-2 text-base md:text-lg">⚠️ {error}</p>
                    <p className="text-sm md:text-base text-slate-500">
                      ESV API may be unavailable or reference format incorrect
                    </p>
                  </div>
                )}
                {chapterError && !contextLoading && (
                  <div className="text-red-600 text-center py-4 mb-4">
                    <p className="mb-2 text-base md:text-lg">⚠️ {chapterError}</p>
                    <p className="text-sm md:text-base text-slate-500">
                      Chapter context could not be loaded. The verse text is still shown below.
                    </p>
                  </div>
                )}
                {showInitialPassageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 dark:text-slate-300 text-base md:text-lg">
                      {contextLoading || (showingContext && !compareChapterText)
                        ? 'Loading chapter...'
                        : 'Loading...'}
                    </span>
                  </div>
                ) : null}
                {!compareError && !error && showPassageSwipeLayer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col min-w-0">
                      {compareTranslation && (
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                          {compareTranslation}
                        </span>
                      )}
                      {!showingContext && compareText && (
                        <div className="prose max-w-none">
                          <ScripturePassageText html={formatPassageText(compareText)} />
                        </div>
                      )}
                      {showingContext && compareChapterText && (
                        <div className="prose max-w-none">
                          <ScripturePassageText html={processChapterText(compareChapterText)} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                        {translation}
                      </span>
                      {!showingContext && scriptureText && (
                        <div className="prose max-w-none" data-tour="scripture-modal-verse-body">
                          <ScripturePassageText
                            html={formatPassageText(scriptureText)}
                            innerRef={passageScopeRef}
                          />
                        </div>
                      )}
                      {showingContext && chapterText && (
                        <div className="prose max-w-none">
                          <ScripturePassageText
                            id="chapter-content"
                            data-tour="scripture-modal-chapter-body"
                            html={processChapterText(chapterText)}
                            innerRef={passageScopeRef}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {chapterError && !contextLoading && (
                  <div className="text-red-600 text-center py-4 mb-4">
                    <p className="mb-2 text-base md:text-lg">⚠️ {chapterError}</p>
                    <p className="text-sm md:text-base text-slate-500">
                      Chapter context could not be loaded. The verse text is still shown below.
                    </p>
                  </div>
                )}
                {error && (
                  <div className="text-red-600 text-center py-8">
                    <p className="mb-2 text-base md:text-lg">⚠️ {error}</p>
                    <p className="text-sm md:text-base text-slate-500">
                      ESV API may be unavailable or reference format incorrect
                    </p>
                  </div>
                )}
                {showInitialPassageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600 text-base md:text-lg">
                      {contextLoading ? 'Loading chapter context...' : 'Loading scripture...'}
                    </span>
                  </div>
                ) : null}
                {!error && showPassageSwipeLayer ? (
                  <>
                    {!showingContext && scriptureText && (
                      <div className="prose max-w-none" data-tour="scripture-modal-verse-body">
                        <ScripturePassageText
                          html={formatPassageText(scriptureText)}
                          innerRef={passageScopeRef}
                        />
                      </div>
                    )}
                    {showingContext && chapterText && (
                      <div className="prose max-w-none">
                        <ScripturePassageText
                          id="chapter-content"
                          data-tour="scripture-modal-chapter-body"
                          html={processChapterText(chapterText)}
                          innerRef={passageScopeRef}
                        />
                      </div>
                    )}
                  </>
                ) : null}
              </>
            )}

            {wordStudyEnabled && wordStudyAvailable && (
              <ScriptureWordStudyModal
                reference={reference}
                isOpen
                onClose={closeWordStudy}
                onOpenReference={onNavigateReference}
              />
            )}

            {/* Attribution - inside scrollable area; same bg as section block (bg-slate-50 dark:bg-slate-700/50) */}
            <div className="scripture-modal-attribution space-y-2 bg-slate-50 dark:bg-slate-700/50 px-4 py-3 mt-4 border-y border-slate-200 dark:border-slate-600">
              {renderAttribution(translation)}
              {compareTranslation && renderAttribution(compareTranslation)}
            </div>
          </div>
        </ScripturePassageSwipeLayer>
      </div>

    </div>

      {typeof document !== 'undefined' &&
        passagePickerOpen &&
        onNavigateReference &&
        createPortal(
          <BiblePassagePickerModal
            isOpen={passagePickerOpen}
            onClose={() => setPassagePickerOpen(false)}
            confirmLabel="Read"
            requireVerse={false}
            variant="reader"
            seedReference={reference}
            onConfirm={(ref, meta) => {
              setChapterView(null)
              setChapterContextError(null)
              initialChapterViewFetchedRef.current = false
              onNavigateReference(ref, { ...meta, fromPassagePicker: true })
              setPassagePickerOpen(false)
            }}
          />,
          document.body
        )}
    </>
  )
}