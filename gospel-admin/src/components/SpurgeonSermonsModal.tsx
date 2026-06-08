'use client'

import {
  useId,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
  startTransition,
} from 'react'
import Link from 'next/link'

import {
  edwardsSermonTitleForModalDisplay,
  isEdwardsSermonProfileSlug,
} from '@/lib/edwards/edwardsSlug'
import {
  isSpurgeonSermonProfileSlug,
  spurgeonSermonTitleForModalDisplay,
} from '@/lib/spurgeon/sortBySpurgeonSermonSlug'
import {
  GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT,
  loadPresentationReadCompleteSlugs,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
} from '@/lib/presentationReadCompleteStorage'

import type { CrossReferenceTarget } from '@/lib/cross-reference-types'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'
import { usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'

const SEARCH_PAGE_SIZE = 100
const CROSS_REF_PAGE_SIZE = 50
export const STUDY_MODAL_DEFAULT_TITLE = 'Study resources'

/** Which corpora to load when opened from a Resources row vs unified Study. */
export type StudyLibraryFocus = 'all' | 'spurgeon' | 'calvin' | 'henry' | 'edwards'

interface SpurgeonSermonsModalProps {
  isOpen: boolean
  onClose: () => void
  /** Dialog heading (Resources menu row label or default). */
  modalTitle?: string
  /**
   * `spurgeon` / `calvin` / `henry` / `edwards`: Resources menu rows (corpus-specific).
   * `all`: scripture modal Study (all By scripture sections).
   */
  libraryFocus?: StudyLibraryFocus
  /** When set as the modal opens, switches to “By scripture”, fills the reference, and runs lookup (all matches). */
  initialByReference?: string | null
  /**
   * Called when the user follows a profile link (before navigation).
   * Use this to dismiss stacked UI such as the scripture reader so the resource opens as a normal full-page profile.
   */
  onFollowSermonLink?: () => void
  /** Open a related verse in the scripture reader (cross references). */
  onOpenScriptureReference?: (reference: string) => void
}

type Tab = 'search' | 'scripture' | 'read'

interface SermonRow {
  slug: string
  title: string
}

type ApiErrorPayload = { error?: unknown }

type ApiFailureSource = {
  active: boolean
  failed: boolean | null | undefined
  payload: ApiErrorPayload
}

function firstStringApiError(sources: ReadonlyArray<ApiFailureSource>): string | null {
  for (const { active, failed, payload } of sources) {
    if (active && failed && typeof payload.error === 'string') return payload.error
  }
  return null
}

function allActiveSourcesFailed(sources: ReadonlyArray<ApiFailureSource>): boolean {
  const active = sources.filter((s) => s.active)
  return active.length > 0 && active.every((s) => Boolean(s.failed))
}

export default function SpurgeonSermonsModal({
  isOpen,
  onClose,
  modalTitle = STUDY_MODAL_DEFAULT_TITLE,
  libraryFocus = 'all',
  initialByReference,
  onFollowSermonLink,
  onOpenScriptureReference,
}: SpurgeonSermonsModalProps) {
  usePostHogModalOpen('study', isOpen, {
    library_focus: libraryFocus,
    reference: initialByReference ?? undefined,
  })
  const titleId = useId()
  const showSpurgeon = libraryFocus === 'all' || libraryFocus === 'spurgeon'
  const showEdwards = libraryFocus === 'all' || libraryFocus === 'edwards'
  const showCalvin = libraryFocus === 'all' || libraryFocus === 'calvin'
  const showHenry = libraryFocus === 'all' || libraryFocus === 'henry'
  const showBooks = libraryFocus === 'all'
  const showReadTab = showSpurgeon || showEdwards
  const [tab, setTab] = useState<Tab>('search')
  /** When read tab is hidden (e.g. Calvin-only library), treat stale `read` selection as search. */
  const activeTab: Tab = tab === 'read' && !showReadTab ? 'search' : tab
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [scriptureRef, setScriptureRef] = useState('')
  const [debouncedScriptureRef, setDebouncedScriptureRef] = useState('')
  const [searchItems, setSearchItems] = useState<SermonRow[]>([])
  const [refItems, setRefItems] = useState<SermonRow[]>([])
  const [edwardsRefItems, setEdwardsRefItems] = useState<SermonRow[]>([])
  const [morneveRefItems, setMorneveRefItems] = useState<SermonRow[]>([])
  const [calvinRefItems, setCalvinRefItems] = useState<SermonRow[]>([])
  const [henryRefItems, setHenryRefItems] = useState<SermonRow[]>([])
  const [bookRefItems, setBookRefItems] = useState<SermonRow[]>([])
  const [crossRefItems, setCrossRefItems] = useState<CrossReferenceTarget[]>([])
  const [crossRefTotal, setCrossRefTotal] = useState(0)
  const [edwardsSearchItems, setEdwardsSearchItems] = useState<SermonRow[]>([])
  const [edwardsSearchTotal, setEdwardsSearchTotal] = useState(0)
  const [calvinSearchItems, setCalvinSearchItems] = useState<SermonRow[]>([])
  const [calvinSearchTotal, setCalvinSearchTotal] = useState(0)
  const [henrySearchItems, setHenrySearchItems] = useState<SermonRow[]>([])
  const [henrySearchTotal, setHenrySearchTotal] = useState(0)
  const [searchLoading, setSearchLoading] = useState(false)
  const [refLoading, setRefLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [refError, setRefError] = useState('')
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchPage, setSearchPage] = useState(1)
  const searchListScrollRef = useRef<HTMLDivElement>(null)
  const searchLoadSeqRef = useRef(0)
  const scriptureLookupSeqRef = useRef(0)

  const [readTabItems, setReadTabItems] = useState<SermonRow[]>([])
  const [readTabLoading, setReadTabLoading] = useState(false)
  const [readTabError, setReadTabError] = useState('')

  const [readCompleteSlugs, setReadCompleteSlugs] = useState<Set<string>>(() =>
    new Set(loadPresentationReadCompleteSlugs())
  )

  const spurgeonReadSlugsKey = useMemo(
    () => [...readCompleteSlugs].filter((s) => isSpurgeonSermonProfileSlug(s)).sort().join(','),
    [readCompleteSlugs]
  )

  const edwardsReadSlugsKey = useMemo(
    () => [...readCompleteSlugs].filter((s) => isEdwardsSermonProfileSlug(s)).sort().join(','),
    [readCompleteSlugs]
  )

  const refreshReadCompleteSlugs = useCallback(() => {
    setReadCompleteSlugs(new Set(loadPresentationReadCompleteSlugs()))
  }, [])

  useEffect(() => {
    const onStatus = (e: Event) => {
      const ce = e as CustomEvent<{ slug: string; read: boolean }>
      if (!ce.detail?.slug) return
      setReadCompleteSlugs((prev) => {
        const next = new Set(prev)
        if (ce.detail.read) next.add(ce.detail.slug)
        else next.delete(ce.detail.slug)
        return next
      })
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === PRESENTATION_READ_COMPLETE_STORAGE_KEY) refreshReadCompleteSlugs()
    }
    window.addEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, onStatus)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshReadCompleteSlugs])

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = q.trim()
      setDebouncedQ(trimmed)
      setSearchPage(1)
    }, 320)
    return () => window.clearTimeout(t)
  }, [q])

  /** Short debounce for by-reference API (same order of magnitude as title search). */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedScriptureRef(scriptureRef.trim())
    }, 350)
    return () => window.clearTimeout(t)
  }, [scriptureRef])

  const loadSearch = useCallback(async () => {
    const seq = ++searchLoadSeqRef.current
    setSearchLoading(true)
    setSearchError('')
    try {
      const params = new URLSearchParams({
        page: String(searchPage),
        pageSize: String(SEARCH_PAGE_SIZE),
      })
      if (debouncedQ) params.set('q', debouncedQ)
      const query = params.toString()

      let sermonRes: Response | null = null
      let edwardsRes: Response | null = null
      let calvinRes: Response | null = null
      let henryRes: Response | null = null
      if (showSpurgeon) {
        sermonRes = await fetch(`/api/spurgeon/sermons?${query}`, { cache: 'no-store' })
      }
      if (showEdwards) {
        edwardsRes = await fetch(`/api/edwards/sermons?${query}`, { cache: 'no-store' })
      }
      if (showCalvin) {
        calvinRes = await fetch(`/api/calvin/books?${query}`, { cache: 'no-store' })
      }
      if (showHenry) {
        henryRes = await fetch(`/api/henry/books?${query}`, { cache: 'no-store' })
      }

      const sermonData = sermonRes ? await sermonRes.json() : {}
      const edwardsData = edwardsRes ? await edwardsRes.json() : {}
      const calvinData = calvinRes ? await calvinRes.json() : {}
      const henryData = henryRes ? await henryRes.json() : {}

      const sermonFailed = showSpurgeon && sermonRes && !sermonRes.ok
      const edwardsFailed = showEdwards && edwardsRes && !edwardsRes.ok
      const calvinFailed = showCalvin && calvinRes && !calvinRes.ok
      const henryFailed = showHenry && henryRes && !henryRes.ok
      const searchFailureSources = [
        { active: showSpurgeon, failed: sermonFailed, payload: sermonData },
        { active: showEdwards, failed: edwardsFailed, payload: edwardsData },
        { active: showCalvin, failed: calvinFailed, payload: calvinData },
        { active: showHenry, failed: henryFailed, payload: henryData },
      ] as const
      if (seq !== searchLoadSeqRef.current) return

      if (allActiveSourcesFailed(searchFailureSources)) {
        setSearchError(
          firstStringApiError(searchFailureSources) ?? 'Could not load study resources'
        )
        setSearchItems([])
        setSearchTotal(0)
        setEdwardsSearchItems([])
        setEdwardsSearchTotal(0)
        setCalvinSearchItems([])
        setCalvinSearchTotal(0)
        setHenrySearchItems([])
        setHenrySearchTotal(0)
        return
      }
      if (sermonFailed || !showSpurgeon) {
        setSearchItems([])
        setSearchTotal(0)
      } else {
        setSearchItems(Array.isArray(sermonData.items) ? sermonData.items : [])
        setSearchTotal(typeof sermonData.total === 'number' ? sermonData.total : (sermonData.items?.length ?? 0))
      }
      if (edwardsFailed || !showEdwards) {
        setEdwardsSearchItems([])
        setEdwardsSearchTotal(0)
      } else {
        setEdwardsSearchItems(Array.isArray(edwardsData.items) ? edwardsData.items : [])
        setEdwardsSearchTotal(
          typeof edwardsData.total === 'number' ? edwardsData.total : (edwardsData.items?.length ?? 0)
        )
      }
      if (calvinFailed || !showCalvin) {
        setCalvinSearchItems([])
        setCalvinSearchTotal(0)
      } else {
        setCalvinSearchItems(Array.isArray(calvinData.items) ? calvinData.items : [])
        setCalvinSearchTotal(typeof calvinData.total === 'number' ? calvinData.total : (calvinData.items?.length ?? 0))
      }
      if (henryFailed || !showHenry) {
        setHenrySearchItems([])
        setHenrySearchTotal(0)
      } else {
        setHenrySearchItems(Array.isArray(henryData.items) ? henryData.items : [])
        setHenrySearchTotal(typeof henryData.total === 'number' ? henryData.total : (henryData.items?.length ?? 0))
      }
      setSearchError('')
    } catch {
      if (seq !== searchLoadSeqRef.current) return
      setSearchError('Could not load study resources')
      setSearchItems([])
      setSearchTotal(0)
      setEdwardsSearchItems([])
      setEdwardsSearchTotal(0)
      setCalvinSearchItems([])
      setCalvinSearchTotal(0)
      setHenrySearchItems([])
      setHenrySearchTotal(0)
    } finally {
      if (seq === searchLoadSeqRef.current) {
        setSearchLoading(false)
      }
    }
  }, [debouncedQ, searchPage, showSpurgeon, showEdwards, showCalvin, showHenry])

  useEffect(() => {
    if (!isOpen || activeTab !== 'search') return
    const t = window.setTimeout(() => {
      void loadSearch()
    }, 0)
    return () => window.clearTimeout(t)
  }, [isOpen, activeTab, loadSearch])

  useEffect(() => {
    const el = searchListScrollRef.current
    if (!el) return
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, behavior: 'auto' })
    } else {
      el.scrollTop = 0
    }
  }, [searchPage, debouncedQ, activeTab])

  const runScriptureLookupForRef = useCallback(async (ref: string) => {
    const seq = ++scriptureLookupSeqRef.current
    const trimmed = ref.trim()
    if (!trimmed) {
      if (seq !== scriptureLookupSeqRef.current) return
      setRefItems([])
      setEdwardsRefItems([])
      setMorneveRefItems([])
      setCalvinRefItems([])
      setHenryRefItems([])
      setBookRefItems([])
      setCrossRefItems([])
      setCrossRefTotal(0)
      setRefError('')
      setRefLoading(false)
      return
    }
    setRefLoading(true)
    setRefError('')
    try {
      const q = encodeURIComponent(trimmed)
      const fetches: Promise<Response>[] = [
        fetch(
          `/api/scripture/cross-references?reference=${q}&offset=0&limit=${CROSS_REF_PAGE_SIZE}`,
          { cache: 'no-store' }
        ),
      ]
      if (showSpurgeon) {
        fetches.push(fetch(`/api/spurgeon/by-reference?reference=${q}`, { cache: 'no-store' }))
        fetches.push(fetch(`/api/morneve/by-reference?reference=${q}`, { cache: 'no-store' }))
      }
      if (showEdwards) {
        fetches.push(fetch(`/api/edwards/by-reference?reference=${q}`, { cache: 'no-store' }))
      }
      if (showCalvin) {
        fetches.push(fetch(`/api/calvin/by-reference?reference=${q}`, { cache: 'no-store' }))
      }
      if (showHenry) {
        fetches.push(fetch(`/api/henry/by-reference?reference=${q}`, { cache: 'no-store' }))
      }
      if (showBooks) {
        fetches.push(fetch(`/api/books/by-reference?reference=${q}`, { cache: 'no-store' }))
      }

      const results = await Promise.all(fetches)
      let ri = 0
      const crossRefRes = results[ri++]
      const sermonRes = showSpurgeon ? results[ri++] : null
      const morneveRes = showSpurgeon ? results[ri++] : null
      const edwardsRes = showEdwards ? results[ri++] : null
      const calvinRes = showCalvin ? results[ri++] : null
      const henryRes = showHenry ? results[ri++] : null
      const booksRes = showBooks ? results[ri++] : null

      const crossRefData = crossRefRes ? await crossRefRes.json() : {}
      const sermonData = sermonRes ? await sermonRes.json() : {}
      const morneveData = morneveRes ? await morneveRes.json() : {}
      const edwardsData = edwardsRes ? await edwardsRes.json() : {}
      const calvinData = calvinRes ? await calvinRes.json() : {}
      const henryData = henryRes ? await henryRes.json() : {}
      const booksData = booksRes ? await booksRes.json() : {}

      const spurgeonAnyOk =
        !showSpurgeon || Boolean(sermonRes?.ok) || Boolean(morneveRes?.ok)
      const edwardsLookupFailed = showEdwards && edwardsRes && !edwardsRes.ok
      const calvinLookupFailed = showCalvin && calvinRes && !calvinRes.ok
      const henryLookupFailed = showHenry && henryRes && !henryRes.ok
      const booksLookupFailed = showBooks && booksRes && !booksRes.ok
      const scriptureFailureSources = [
        {
          active: showSpurgeon,
          failed: showSpurgeon && !spurgeonAnyOk,
          payload: sermonData,
        },
        { active: showEdwards, failed: edwardsLookupFailed, payload: edwardsData },
        {
          active: showSpurgeon,
          failed: showSpurgeon && morneveRes && !morneveRes.ok,
          payload: morneveData,
        },
        { active: showCalvin, failed: calvinLookupFailed, payload: calvinData },
        { active: showHenry, failed: henryLookupFailed, payload: henryData },
        { active: showBooks, failed: booksLookupFailed, payload: booksData },
      ] as const
      if (seq !== scriptureLookupSeqRef.current) return

      if (!crossRefRes?.ok) {
        setCrossRefItems([])
        setCrossRefTotal(0)
      } else {
        setCrossRefItems(Array.isArray(crossRefData.items) ? crossRefData.items : [])
        setCrossRefTotal(typeof crossRefData.total === 'number' ? crossRefData.total : 0)
      }

      if (allActiveSourcesFailed(scriptureFailureSources)) {
        setRefError(firstStringApiError(scriptureFailureSources) ?? 'Lookup failed')
        setRefItems([])
        setEdwardsRefItems([])
        setMorneveRefItems([])
        setCalvinRefItems([])
        setHenryRefItems([])
        setBookRefItems([])
        return
      }

      if (!showSpurgeon || !sermonRes?.ok) {
        setRefItems([])
      } else {
        setRefItems(Array.isArray(sermonData.items) ? sermonData.items : [])
      }
      if (!showEdwards || !edwardsRes?.ok) {
        setEdwardsRefItems([])
      } else {
        setEdwardsRefItems(Array.isArray(edwardsData.items) ? edwardsData.items : [])
      }
      if (!showSpurgeon || !morneveRes?.ok) {
        setMorneveRefItems([])
      } else {
        setMorneveRefItems(Array.isArray(morneveData.items) ? morneveData.items : [])
      }
      if (!showCalvin || !calvinRes?.ok) {
        setCalvinRefItems([])
      } else {
        setCalvinRefItems(Array.isArray(calvinData.items) ? calvinData.items : [])
      }
      if (!showHenry || !henryRes?.ok) {
        setHenryRefItems([])
      } else {
        setHenryRefItems(Array.isArray(henryData.items) ? henryData.items : [])
      }
      if (!showBooks || !booksRes?.ok) {
        setBookRefItems([])
      } else {
        setBookRefItems(Array.isArray(booksData.items) ? booksData.items : [])
      }
      setRefError('')
    } catch {
      if (seq !== scriptureLookupSeqRef.current) return
      setRefError('Lookup failed')
      setRefItems([])
      setEdwardsRefItems([])
      setMorneveRefItems([])
      setCalvinRefItems([])
      setHenryRefItems([])
      setBookRefItems([])
      setCrossRefItems([])
      setCrossRefTotal(0)
    } finally {
      if (seq === scriptureLookupSeqRef.current) {
        setRefLoading(false)
      }
    }
  }, [showSpurgeon, showEdwards, showCalvin, showHenry, showBooks])

  const loadMoreCrossRefs = useCallback(async () => {
    const trimmed = debouncedScriptureRef.trim()
    if (!trimmed || crossRefItems.length >= crossRefTotal) return
    try {
      const res = await fetch(
        `/api/scripture/cross-references?reference=${encodeURIComponent(trimmed)}&offset=${crossRefItems.length}&limit=${CROSS_REF_PAGE_SIZE}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) return
      const nextItems = Array.isArray(data.items) ? (data.items as CrossReferenceTarget[]) : []
      setCrossRefItems((prev) => [...prev, ...nextItems])
      if (typeof data.total === 'number') setCrossRefTotal(data.total)
    } catch {
      // Keep already loaded rows.
    }
  }, [crossRefItems.length, crossRefTotal, debouncedScriptureRef])

  useEffect(() => {
    if (!isOpen) {
      startTransition(() => {
        setTab('search')
        setQ('')
        setDebouncedQ('')
        setSearchPage(1)
        setScriptureRef('')
        setDebouncedScriptureRef('')
        setSearchItems([])
        setSearchTotal(0)
        setRefItems([])
        setEdwardsRefItems([])
        setMorneveRefItems([])
        setCalvinRefItems([])
        setHenryRefItems([])
        setBookRefItems([])
        setCrossRefItems([])
        setCrossRefTotal(0)
        setEdwardsSearchItems([])
        setEdwardsSearchTotal(0)
        setCalvinSearchItems([])
        setCalvinSearchTotal(0)
        setHenrySearchItems([])
        setHenrySearchTotal(0)
        setReadTabItems([])
        setReadTabError('')
        setReadTabLoading(false)
        setSearchError('')
        setRefError('')
      })
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return
    startTransition(() => {
      if (initialByReference?.trim()) {
        setTab('scripture')
        setScriptureRef(initialByReference.trim())
        return
      }
      if (libraryFocus === 'edwards' || libraryFocus === 'calvin' || libraryFocus === 'henry') {
        setTab('search')
      }
    })
  }, [isOpen, initialByReference, libraryFocus])

  useEffect(() => {
    if (!isOpen || activeTab !== 'scripture') return
    const t = window.setTimeout(() => {
      void runScriptureLookupForRef(debouncedScriptureRef)
    }, 0)
    return () => window.clearTimeout(t)
  }, [isOpen, activeTab, debouncedScriptureRef, runScriptureLookupForRef])

  useEffect(() => {
    if (!isOpen || activeTab !== 'read') return
    const sgSlugs = showSpurgeon && spurgeonReadSlugsKey ? spurgeonReadSlugsKey.split(',') : []
    const jeSlugs = showEdwards && edwardsReadSlugsKey ? edwardsReadSlugsKey.split(',') : []
    if (sgSlugs.length === 0 && jeSlugs.length === 0) {
      startTransition(() => {
        setReadTabItems([])
        setReadTabError('')
        setReadTabLoading(false)
      })
      return
    }
    let cancelled = false
    startTransition(() => {
      setReadTabLoading(true)
      setReadTabError('')
    })
    const fetches: Promise<Response>[] = []
    if (sgSlugs.length > 0) {
      fetches.push(
        fetch(`/api/spurgeon/by-slugs?slugs=${encodeURIComponent(sgSlugs.join(','))}`, { cache: 'no-store' })
      )
    }
    if (jeSlugs.length > 0) {
      fetches.push(
        fetch(`/api/edwards/by-slugs?slugs=${encodeURIComponent(jeSlugs.join(','))}`, { cache: 'no-store' })
      )
    }
    void Promise.all(fetches)
      .then(async (responses) => {
        if (cancelled) return
        const rows: SermonRow[] = []
        let hadError = false
        for (const res of responses) {
          const data = (await res.json()) as { items?: unknown; error?: string }
          if (!res.ok) {
            hadError = true
            continue
          }
          const items = Array.isArray(data.items) ? data.items : []
          for (const row of items) {
            if (!row || typeof row !== 'object') continue
            const r = row as Record<string, unknown>
            if (typeof r.slug === 'string' && typeof r.title === 'string') {
              rows.push({ slug: r.slug, title: r.title })
            }
          }
        }
        if (hadError && rows.length === 0) {
          setReadTabItems([])
          setReadTabError('Could not load read sermons')
          return
        }
        setReadTabItems(rows)
        setReadTabError('')
      })
      .catch(() => {
        if (!cancelled) {
          setReadTabItems([])
          setReadTabError('Could not load read sermons')
        }
      })
      .finally(() => {
        if (!cancelled) setReadTabLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, activeTab, showSpurgeon, showEdwards, spurgeonReadSlugsKey, edwardsReadSlugsKey])

  if (!isOpen) return null

  const searchPlaceholder =
    libraryFocus === 'all'
      ? 'Title or keyword (sermons or commentary books)'
      : libraryFocus === 'henry'
        ? 'Matthew Henry commentary book title or keyword'
        : libraryFocus === 'calvin'
          ? 'Commentary book title or keyword'
          : libraryFocus === 'edwards'
            ? 'Edwards sermon title or keyword'
            : 'Sermon title or keyword'

  const sermonSearchTotalPages =
    showSpurgeon && searchTotal > 0 ? Math.ceil(searchTotal / SEARCH_PAGE_SIZE) : 0
  const edwardsSearchTotalPages =
    showEdwards && edwardsSearchTotal > 0 ? Math.ceil(edwardsSearchTotal / SEARCH_PAGE_SIZE) : 0
  const calvinSearchTotalPages =
    showCalvin && calvinSearchTotal > 0 ? Math.ceil(calvinSearchTotal / SEARCH_PAGE_SIZE) : 0
  const henrySearchTotalPages =
    showHenry && henrySearchTotal > 0 ? Math.ceil(henrySearchTotal / SEARCH_PAGE_SIZE) : 0
  const combinedSearchTotalPages = Math.max(
    sermonSearchTotalPages,
    edwardsSearchTotalPages,
    calvinSearchTotalPages,
    henrySearchTotalPages,
    1
  )

  const sermonRangeOnPage =
    showSpurgeon && searchTotal > 0 && searchPage <= sermonSearchTotalPages
  const edwardsRangeOnPage =
    showEdwards && edwardsSearchTotal > 0 && searchPage <= edwardsSearchTotalPages
  const calvinRangeOnPage =
    showCalvin && calvinSearchTotal > 0 && searchPage <= calvinSearchTotalPages
  const henryRangeOnPage =
    showHenry && henrySearchTotal > 0 && searchPage <= henrySearchTotalPages

  const sermonSearchFrom = sermonRangeOnPage ? (searchPage - 1) * SEARCH_PAGE_SIZE + 1 : 0
  const sermonSearchTo = sermonRangeOnPage
    ? Math.min(searchPage * SEARCH_PAGE_SIZE, searchTotal)
    : 0
  const edwardsSearchFrom = edwardsRangeOnPage ? (searchPage - 1) * SEARCH_PAGE_SIZE + 1 : 0
  const edwardsSearchTo = edwardsRangeOnPage
    ? Math.min(searchPage * SEARCH_PAGE_SIZE, edwardsSearchTotal)
    : 0
  const calvinSearchFrom = calvinRangeOnPage ? (searchPage - 1) * SEARCH_PAGE_SIZE + 1 : 0
  const calvinSearchTo = calvinRangeOnPage
    ? Math.min(searchPage * SEARCH_PAGE_SIZE, calvinSearchTotal)
    : 0
  const henrySearchFrom = henryRangeOnPage ? (searchPage - 1) * SEARCH_PAGE_SIZE + 1 : 0
  const henrySearchTo = henryRangeOnPage
    ? Math.min(searchPage * SEARCH_PAGE_SIZE, henrySearchTotal)
    : 0

  const searchRangeLabels: string[] = []
  if (sermonRangeOnPage) {
    searchRangeLabels.push(`Sermons ${sermonSearchFrom}–${sermonSearchTo} of ${searchTotal}`)
  }
  if (edwardsRangeOnPage) {
    searchRangeLabels.push(`Edwards ${edwardsSearchFrom}–${edwardsSearchTo} of ${edwardsSearchTotal}`)
  }
  if (calvinRangeOnPage) {
    searchRangeLabels.push(`Calvin ${calvinSearchFrom}–${calvinSearchTo} of ${calvinSearchTotal}`)
  }
  if (henryRangeOnPage) {
    searchRangeLabels.push(`Matthew Henry ${henrySearchFrom}–${henrySearchTo} of ${henrySearchTotal}`)
  }

  const hasSearchResults =
    (showSpurgeon && searchTotal > 0) ||
    (showEdwards && edwardsSearchTotal > 0) ||
    (showCalvin && calvinSearchTotal > 0) ||
    (showHenry && henrySearchTotal > 0)

  const searchEmptyMessage =
    libraryFocus === 'all'
      ? 'No matching study resources.'
      : libraryFocus === 'henry'
        ? 'No matching Matthew Henry commentary books.'
        : libraryFocus === 'calvin'
          ? 'No matching Calvin commentary books.'
          : libraryFocus === 'edwards'
            ? 'No matching Edwards sermons.'
            : 'No matching public sermons.'

  const scriptureEmptyMessage =
    libraryFocus === 'all'
      ? 'No indexed study resources for that reference.'
      : libraryFocus === 'henry'
        ? 'No indexed Matthew Henry commentary for that reference.'
        : libraryFocus === 'calvin'
          ? 'No indexed Calvin commentary for that reference.'
          : libraryFocus === 'edwards'
            ? 'No Edwards sermons indexed for that reference. Try Deuteronomy 32:35, or use the Search tab to browse all 19 sermons.'
            : 'No indexed sermons or Morning & Evening devotions for that reference.'

  const followResourceLink = () => {
    onFollowSermonLink?.()
    onClose()
  }

  const studyRefForProfileLinks = debouncedScriptureRef || scriptureRef.trim()
  const debouncedScriptureQuery = debouncedScriptureRef.trim()
  const scriptureInputPending = scriptureRef.trim() !== debouncedScriptureQuery

  const profileHref = (slug: string) => {
    if (activeTab === 'scripture' && studyRefForProfileLinks) {
      return `/${slug}?studyRef=${encodeURIComponent(studyRefForProfileLinks)}`
    }
    return `/${slug}`
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-start justify-center overflow-x-hidden bg-black/50 dark:bg-black/70 pt-[max(2.5rem,env(safe-area-inset-top,0))] sm:pt-[max(3.5rem,env(safe-area-inset-top,0))] pb-[max(2rem,max(48px,env(safe-area-inset-bottom,0)))] pl-[max(1rem,env(safe-area-inset-left,0))] pr-[max(1rem,env(safe-area-inset-right,0))]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="min-w-0 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[calc(100dvh-max(2.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] sm:max-h-[calc(100dvh-max(3.5rem,env(safe-area-inset-top,0))-max(2rem,max(48px,env(safe-area-inset-bottom,0))))] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-200 dark:border-slate-600 px-5 py-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 flex flex-wrap border-b border-slate-200 dark:border-slate-600 px-2 pt-2 gap-1">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`cursor-pointer px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
              activeTab === 'search'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setTab('scripture')}
            className={`cursor-pointer px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
              activeTab === 'scripture'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            By scripture
          </button>
          {showReadTab ? (
            <button
              type="button"
              onClick={() => setTab('read')}
              className={`cursor-pointer px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                activeTab === 'read'
                  ? 'border-blue-600 text-blue-700 dark:text-blue-300 dark:border-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              By read
            </button>
          ) : null}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeTab === 'search' && (
            <div className="shrink-0 space-y-2 border-b border-slate-200 dark:border-slate-600 px-5 pt-4 pb-3">
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                <span className="sr-only">Search by title or keyword</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full min-w-0 px-3 py-2 text-base rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  autoComplete="off"
                  data-tour="spurgeon-modal-search"
                />
              </label>
              {searchError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {searchError}
                </p>
              )}
            </div>
          )}

          {activeTab === 'scripture' && (
            <div className="shrink-0 space-y-2 border-b border-slate-200 dark:border-slate-600 px-5 pt-4 pb-3">
              <div className="flex flex-col gap-1">
                <label className="block text-sm text-slate-600 dark:text-slate-300">
                  <span className="sr-only">Scripture reference</span>
                  <input
                    type="text"
                    value={scriptureRef}
                    onChange={(e) => setScriptureRef(e.target.value)}
                    placeholder="e.g. John 3:16"
                    className="w-full min-w-0 px-3 py-2 text-base rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    aria-label="Scripture reference"
                    autoComplete="off"
                    data-tour="spurgeon-modal-by-ref"
                  />
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {refLoading
                    ? 'Searching…'
                    : scriptureInputPending
                      ? 'Updating…'
                      : showEdwards && !showSpurgeon && !showCalvin
                        ? 'Only indexed passages in the 19 Edwards sermons (e.g. Deuteronomy 32:35). Use Search to browse by title.'
                        : 'Results update shortly after you stop typing.'}
                </p>
              </div>
              {refError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {refError}
                </p>
              )}
            </div>
          )}

          {activeTab === 'read' && (
            <div
              className="shrink-0 border-b border-slate-200 dark:border-slate-600 px-5 pt-4 pb-3"
              data-tour="spurgeon-modal-by-read"
            >
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {showSpurgeon && showEdwards
                  ? 'Spurgeon and Edwards sermon profiles you have read to the end on this device.'
                  : showEdwards
                    ? 'Edwards sermon profiles you have read to the end on this device.'
                    : 'Spurgeon sermon profiles you have read to the end on this device (Listen through the last section or scroll to the bottom).'}
              </p>
              {readTabError ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {readTabError}
                </p>
              ) : null}
            </div>
          )}

          <div
            ref={searchListScrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-4"
          >
            {activeTab === 'search' && (
              <>
                {/* Stable min-height so loading ↔ results does not shift the dialog vertically */}
                <div className="min-h-56">
                  {searchLoading ? (
                    <div className="flex h-56 items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    </div>
                  ) : (showSpurgeon ? searchItems.length === 0 : true) &&
                    (showEdwards ? edwardsSearchItems.length === 0 : true) &&
                    (showCalvin ? calvinSearchItems.length === 0 : true) &&
                    (showHenry ? henrySearchItems.length === 0 : true) ? (
                    <div className="flex h-56 items-start pt-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{searchEmptyMessage}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {showSpurgeon && searchItems.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Spurgeon Sermons
                          </h3>
                          <ul className="space-y-1">
                            {searchItems.map((row) => (
                              <li key={row.slug}>
                                <Link
                                  href={`/${row.slug}`}
                                  onClick={followResourceLink}
                                  className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                                    readCompleteSlugs.has(row.slug)
                                      ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                      : 'font-normal text-blue-700 dark:text-blue-300'
                                  }`}
                                >
                                  {spurgeonSermonTitleForModalDisplay(row.title)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {showEdwards && edwardsSearchItems.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Edwards sermons
                          </h3>
                          <ul className="space-y-1">
                            {edwardsSearchItems.map((row) => (
                              <li key={row.slug}>
                                <Link
                                  href={`/${row.slug}`}
                                  onClick={followResourceLink}
                                  className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                                    readCompleteSlugs.has(row.slug)
                                      ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                      : 'font-normal text-blue-700 dark:text-blue-300'
                                  }`}
                                >
                                  {edwardsSermonTitleForModalDisplay(row.title)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {showCalvin && calvinSearchItems.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Calvin commentaries
                          </h3>
                          <ul className="space-y-1">
                            {calvinSearchItems.map((row) => (
                              <li key={row.slug}>
                                <Link
                                  href={`/${row.slug}`}
                                  onClick={followResourceLink}
                                  className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                                    readCompleteSlugs.has(row.slug)
                                      ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                      : 'font-normal text-blue-700 dark:text-blue-300'
                                  }`}
                                >
                                  {row.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {showHenry && henrySearchItems.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Matthew Henry commentaries
                          </h3>
                          <ul className="space-y-1">
                            {henrySearchItems.map((row) => (
                              <li key={row.slug}>
                                <Link
                                  href={`/${row.slug}`}
                                  onClick={followResourceLink}
                                  className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                                    readCompleteSlugs.has(row.slug)
                                      ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                      : 'font-normal text-blue-700 dark:text-blue-300'
                                  }`}
                                >
                                  {row.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'scripture' && (
              <div className="min-h-40 space-y-4">
                {refLoading && debouncedScriptureQuery ? (
                  <div className="flex min-h-24 items-center justify-center">
                    <div
                      className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"
                      aria-hidden
                    />
                    <span className="sr-only">Searching by scripture reference</span>
                  </div>
                ) : null}
                {!refLoading &&
                  !scriptureInputPending &&
                  crossRefItems.length === 0 &&
                  (showSpurgeon ? refItems.length === 0 && morneveRefItems.length === 0 : true) &&
                  (showEdwards ? edwardsRefItems.length === 0 : true) &&
                  (showCalvin ? calvinRefItems.length === 0 : true) &&
                  (showHenry ? henryRefItems.length === 0 : true) &&
                  (showBooks ? bookRefItems.length === 0 : true) &&
                  debouncedScriptureQuery &&
                  !refError && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{scriptureEmptyMessage}</p>
                  )}
                {crossRefItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Cross references
                    </h3>
                    <ul className="space-y-1">
                      {crossRefItems.map((row) => (
                        <li key={row.passageKey}>
                          <ScriptureHoverModal reference={row.reference} hoverDelayMs={500}>
                            <button
                              type="button"
                              onClick={() => onOpenScriptureReference?.(row.reference)}
                              disabled={!onOpenScriptureReference}
                              className="block w-full cursor-pointer text-left rounded-md px-2 py-2 text-sm font-normal text-blue-700 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 disabled:opacity-60 disabled:cursor-default"
                            >
                              {row.reference}
                            </button>
                          </ScriptureHoverModal>
                        </li>
                      ))}
                    </ul>
                    {crossRefItems.length < crossRefTotal && (
                      <button
                        type="button"
                        onClick={() => void loadMoreCrossRefs()}
                        className="mt-2 cursor-pointer px-2 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md"
                      >
                        Load more ({crossRefItems.length} of {crossRefTotal})
                      </button>
                    )}
                  </div>
                )}
                {showSpurgeon && refItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Spurgeon Sermons
                    </h3>
                    <ul className="space-y-1">
                      {refItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={profileHref(row.slug)}
                            scroll={false}
                            onClick={followResourceLink}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {spurgeonSermonTitleForModalDisplay(row.title)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {showEdwards && edwardsRefItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Edwards sermons
                    </h3>
                    <ul className="space-y-1">
                      {edwardsRefItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={profileHref(row.slug)}
                            scroll={false}
                            onClick={followResourceLink}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {edwardsSermonTitleForModalDisplay(row.title)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {showSpurgeon && morneveRefItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Morning &amp; Evening
                    </h3>
                    <ul className="space-y-1">
                      {morneveRefItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={profileHref(row.slug)}
                            scroll={false}
                            onClick={followResourceLink}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {row.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {showCalvin && calvinRefItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Calvin commentaries
                    </h3>
                    <ul className="space-y-1">
                      {calvinRefItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={profileHref(row.slug)}
                            scroll={false}
                            onClick={followResourceLink}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {row.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {showHenry && henryRefItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Matthew Henry commentaries
                    </h3>
                    <ul className="space-y-1">
                      {henryRefItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={profileHref(row.slug)}
                            scroll={false}
                            onClick={followResourceLink}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {row.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {showBooks && bookRefItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Books
                    </h3>
                    <ul className="space-y-1">
                      {bookRefItems.map((row) => (
                        <li key={row.slug}>
                          <Link
                            href={profileHref(row.slug)}
                            scroll={false}
                            onClick={followResourceLink}
                            className={`block rounded-md px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/80 ${
                              readCompleteSlugs.has(row.slug)
                                ? 'font-extrabold text-blue-900 dark:text-blue-200'
                                : 'font-normal text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {row.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'read' && (
              <div className="min-h-40">
                {readTabLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  </div>
                ) : readTabItems.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {spurgeonReadSlugsKey || edwardsReadSlugsKey
                      ? 'No matching public sermons were found for your read list.'
                      : showEdwards
                        ? 'No Edwards sermons in your read list yet. Open a sermon and scroll to the bottom of the page.'
                        : 'No Spurgeon sermons in your read list yet. Open a sermon and use Listen through the last section or scroll to the bottom of the page.'}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {readTabItems.map((row) => (
                      <li key={row.slug}>
                        <Link
                          href={`/${row.slug}`}
                          onClick={() => {
                            onFollowSermonLink?.()
                            onClose()
                          }}
                          className="block rounded-md px-2 py-2 text-sm font-extrabold text-blue-900 dark:text-blue-200 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                        >
                          {isEdwardsSermonProfileSlug(row.slug)
                            ? edwardsSermonTitleForModalDisplay(row.title)
                            : spurgeonSermonTitleForModalDisplay(row.title)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {activeTab === 'search' && !searchLoading && hasSearchResults && (
            <nav
              className="shrink-0 border-t border-slate-200 dark:border-slate-600 px-5 py-3 flex flex-wrap items-center justify-between gap-2 bg-slate-50/90 dark:bg-slate-900/80"
              aria-label="Study search pagination"
            >
              <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                {searchRangeLabels.join(' · ')}
                {searchRangeLabels.length > 0 && combinedSearchTotalPages > 1
                  ? ` · Page ${searchPage} of ${combinedSearchTotalPages}`
                  : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                  disabled={searchPage <= 1}
                  className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border-2 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setSearchPage((p) => Math.min(combinedSearchTotalPages, p + 1))}
                  disabled={searchPage >= combinedSearchTotalPages}
                  className="cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border-2 border-slate-400 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
