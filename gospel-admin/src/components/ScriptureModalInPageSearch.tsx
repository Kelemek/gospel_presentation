'use client'

import type { RefObject } from 'react'
import OpenItemInPageSearch from '@/components/OpenItemInPageSearch'
import { SCRIPTURE_SEARCH_INPUT_ARIA_LABEL } from '@/lib/profileResourceInPageSearch'

export type ScriptureModalInPageSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentRootRef: RefObject<HTMLElement | null>
  onActiveMatchChange?: (activeIndex: number, matchCount: number) => void
}

export default function ScriptureModalInPageSearch(props: ScriptureModalInPageSearchProps) {
  return (
    <OpenItemInPageSearch
      {...props}
      ariaLabel={SCRIPTURE_SEARCH_INPUT_ARIA_LABEL}
      placeholder={SCRIPTURE_SEARCH_INPUT_ARIA_LABEL}
      scrollMode="container"
    />
  )
}
