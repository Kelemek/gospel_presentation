/** Shared 36×36 scripture modal header icon buttons (Listen, Share). */
const SCRIPTURE_MODAL_HEADER_BTN_BOX =
  'shrink-0 box-border h-9 w-9 min-h-[36px] min-w-[36px] p-0 rounded-md inline-flex items-center justify-center leading-none transition-colors appearance-none'

/** Prev/next only: full 36px height, narrow width on phones for the passage reference. */
const SCRIPTURE_MODAL_HEADER_NAV_BTN_BOX =
  'shrink-0 box-border h-9 min-h-[36px] w-5 min-w-[20px] md:w-9 md:min-w-[36px] p-0 rounded-md inline-flex items-center justify-center leading-none transition-colors appearance-none'

const SCRIPTURE_MODAL_HEADER_ICON_BTN_COLORS =
  'bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 dark:active:bg-slate-800 dark:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

export const scriptureModalHeaderIconButtonClass =
  `${SCRIPTURE_MODAL_HEADER_BTN_BOX} ${SCRIPTURE_MODAL_HEADER_ICON_BTN_COLORS}`

export const scriptureModalHeaderNavButtonClass =
  `${SCRIPTURE_MODAL_HEADER_NAV_BTN_BOX} ${SCRIPTURE_MODAL_HEADER_ICON_BTN_COLORS}`

/** Chevron size for prev/next (pairs with `scriptureModalHeaderNavButtonClass`). */
export const scriptureModalHeaderNavIconClass = 'w-4 h-4 shrink-0 md:w-5 md:h-5'

export const scriptureModalHeaderCloseButtonClass =
  `${SCRIPTURE_MODAL_HEADER_BTN_BOX} cursor-pointer text-slate-600 dark:text-slate-200 text-lg font-bold bg-white dark:bg-slate-600 shadow-sm ring-1 ring-slate-300/80 dark:ring-slate-500/60 hover:bg-slate-50 dark:hover:bg-slate-500 hover:ring-slate-400 dark:hover:ring-slate-400 active:bg-slate-100 dark:active:bg-slate-400`

/** Same 36×36 close control; background fill only on hover (e.g. nested modals). */
export const scriptureModalHeaderCloseButtonHoverOnlyClass =
  `${SCRIPTURE_MODAL_HEADER_BTN_BOX} cursor-pointer text-slate-600 dark:text-slate-200 text-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600`
