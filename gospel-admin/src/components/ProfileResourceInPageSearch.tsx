'use client'

import type { RefObject } from 'react'
import OpenItemInPageSearch, {
  RESOURCE_SEARCH_INPUT_ARIA_LABEL,
} from '@/components/OpenItemInPageSearch'

export type ProfileResourceInPageSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentRootRef: RefObject<HTMLElement | null>
  /** When true, skip running search (e.g. scripture modal open). */
  searchPaused?: boolean
  onActiveMatchChange?: (activeIndex: number, matchCount: number) => void
  profileSlug?: string
}

export default function ProfileResourceInPageSearch(props: ProfileResourceInPageSearchProps) {
  return (
    <OpenItemInPageSearch
      {...props}
      ariaLabel={RESOURCE_SEARCH_INPUT_ARIA_LABEL}
      placeholder={RESOURCE_SEARCH_INPUT_ARIA_LABEL}
      scrollMode="window"
    />
  )
}
