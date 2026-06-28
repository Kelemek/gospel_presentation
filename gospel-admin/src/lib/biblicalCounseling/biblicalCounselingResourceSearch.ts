import {
  isBiblicalCounselingSecularMapProfile,
  SECULAR_TERM_MAP_SECTION_DOM_ID,
} from '@/lib/biblicalCounseling/biblicalCounselingReference'
import {
  lookupSecularTermMap,
  type SecularTermLookupResult,
  type SecularTermMapFile,
} from '@/lib/biblicalCounseling/secularTermMap'
import {
  locatePlainOffsetInSearchIndex,
  runProfileResourceSearch,
  type PlainTextRange,
  type ProfileResourceSearchHandle,
  type ProfileResourceSearchScrollOptions,
  type ProfileResourceSearchTextIndex,
  type RunProfileResourceSearchOptions,
} from '@/lib/profileResourceInPageSearch'

export type BiblicalCounselingSearchMappingHint = SecularTermLookupResult

export type BiblicalCounselingResourceSearchHandle = ProfileResourceSearchHandle & {
  mappingHint: BiblicalCounselingSearchMappingHint | null
}

export function isPlainRangeInsideSection(
  scope: HTMLElement,
  range: PlainTextRange,
  index: ProfileResourceSearchTextIndex,
  sectionId: string
): boolean {
  const start = locatePlainOffsetInSearchIndex(index, range.start)
  if (!start) return false
  let el: Node | null = start.node
  while (el && el !== scope) {
    if (el instanceof HTMLElement && el.id === sectionId) return true
    el = el.parentNode
  }
  return false
}

export function prioritizeSecularTermMapSearchRanges(
  scope: HTMLElement,
  ranges: PlainTextRange[],
  textIndex: ProfileResourceSearchTextIndex,
  sectionId: string = SECULAR_TERM_MAP_SECTION_DOM_ID
): PlainTextRange[] {
  if (ranges.length <= 1) return ranges
  return [...ranges].sort((a, b) => {
    const aPinned = isPlainRangeInsideSection(scope, a, textIndex, sectionId)
    const bPinned = isPlainRangeInsideSection(scope, b, textIndex, sectionId)
    if (aPinned === bPinned) return 0
    return aPinned ? -1 : 1
  })
}

export function runBiblicalCounselingResourceSearch(
  scope: HTMLElement | null,
  query: string,
  profileSlug: string | null | undefined,
  options?: Omit<RunProfileResourceSearchOptions, 'reorderRanges'> & {
    secularTermMap?: SecularTermMapFile
  }
): BiblicalCounselingResourceSearchHandle {
  const lookup = isBiblicalCounselingSecularMapProfile(profileSlug)
    ? lookupSecularTermMap(query, options?.secularTermMap)
    : null

  const handle = runProfileResourceSearch(scope, query, {
    ...options,
    reorderRanges:
      lookup && scope
        ? (ranges, textIndex, searchScope) =>
            prioritizeSecularTermMapSearchRanges(searchScope, ranges, textIndex)
        : undefined,
  })

  return {
    ...handle,
    mappingHint: lookup && handle.count > 0 ? lookup : null,
  }
}

export type { ProfileResourceSearchScrollOptions }
