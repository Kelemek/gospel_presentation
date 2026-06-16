/** Pin + highlight color picker triggers in the scripture modal toolbar (icon + chevron). */
export const SCRIPTURE_MODAL_COLOR_PICKER_TRIGGER_WIDTH_CLASS =
  'flex-none w-[54px] min-w-[54px] max-w-[54px] shrink-0 grow-0'

export const scriptureModalColorPickerTriggerButtonClass =
  `inline-flex items-center justify-center gap-1 rounded-md border-2 h-9 min-h-[36px] box-border transition-colors ${SCRIPTURE_MODAL_COLOR_PICKER_TRIGGER_WIDTH_CLASS} ` +
  'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-700 ' +
  'text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-700'

export const scriptureModalColorPickerTriggerInteractiveClass = `${scriptureModalColorPickerTriggerButtonClass} cursor-pointer disabled:cursor-not-allowed`

export const scriptureModalColorPickerOptionButtonClass =
  'flex items-center justify-center rounded px-2 py-2 min-h-[38px] w-full gap-2 ' +
  'hover:bg-slate-200 dark:hover:bg-slate-600 aria-selected:bg-slate-300/80 dark:aria-selected:bg-slate-600/80 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500'
