import type { CSSProperties } from 'react'
import type { VersePinColorId } from '@/lib/versePinStorage'

export const PILL_LINK_CLASS =
  'px-1.5 py-0.5 font-medium text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-700 rounded transition-colors cursor-pointer whitespace-nowrap no-underline'

export const PILL_STYLE: CSSProperties = {
  display: 'inline',
  margin: '0 2px',
  verticalAlign: 'baseline',
  fontSize: 'inherit',
}

export const VERSE_PIN_PILL_STYLES: Record<
  VersePinColorId,
  { pill: string; unpinWrap: string }
> = {
  red: {
    pill:
      'px-1.5 py-0.5 font-semibold text-red-900 dark:text-red-100 bg-red-200 dark:bg-red-950/55 hover:bg-red-300 dark:hover:bg-red-900/65 border-2 border-red-500 dark:border-red-700 hover:border-red-600 dark:hover:border-red-500 rounded transition-colors cursor-pointer whitespace-nowrap no-underline pr-5',
    unpinWrap:
      'text-red-800 dark:text-red-200 hover:text-red-950 dark:hover:text-red-50',
  },
  blue: {
    pill:
      'px-1.5 py-0.5 font-semibold text-blue-900 dark:text-blue-100 bg-blue-200 dark:bg-blue-950/50 hover:bg-blue-300 dark:hover:bg-blue-900/60 border-2 border-blue-500 dark:border-blue-700 hover:border-blue-600 dark:hover:border-blue-500 rounded transition-colors cursor-pointer whitespace-nowrap no-underline pr-5',
    unpinWrap:
      'text-blue-800 dark:text-blue-200 hover:text-blue-950 dark:hover:text-blue-50',
  },
  yellow: {
    pill:
      'px-1.5 py-0.5 font-semibold text-yellow-900 dark:text-yellow-100 bg-yellow-200 dark:bg-yellow-900/45 hover:bg-yellow-300 dark:hover:bg-yellow-900/65 border-2 border-yellow-500 dark:border-yellow-700 hover:border-yellow-600 dark:hover:border-yellow-500 rounded transition-colors cursor-pointer whitespace-nowrap no-underline pr-5',
    unpinWrap:
      'text-yellow-900 dark:text-yellow-200 hover:text-yellow-950 dark:hover:text-yellow-50',
  },
  green: {
    pill:
      'px-1.5 py-0.5 font-semibold text-emerald-950 dark:text-emerald-50 bg-emerald-200 dark:bg-emerald-950/45 hover:bg-emerald-300 dark:hover:bg-emerald-900/60 border-2 border-emerald-600 dark:border-emerald-700 hover:border-emerald-700 dark:hover:border-emerald-500 rounded transition-colors cursor-pointer whitespace-nowrap no-underline pr-5',
    unpinWrap:
      'text-emerald-900 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-emerald-50',
  },
  violet: {
    pill:
      'px-1.5 py-0.5 font-semibold text-violet-900 dark:text-violet-100 bg-violet-200 dark:bg-violet-950/45 hover:bg-violet-300 dark:hover:bg-violet-900/60 border-2 border-violet-600 dark:border-violet-700 hover:border-violet-700 dark:hover:border-violet-500 rounded transition-colors cursor-pointer whitespace-nowrap no-underline pr-5',
    unpinWrap:
      'text-violet-900 dark:text-violet-200 hover:text-violet-950 dark:hover:text-violet-50',
  },
}
