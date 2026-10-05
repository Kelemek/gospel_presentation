/** Tour opens Reader display without simulating a 1s long-press under driver.js. */
export const GOSPEL_SCRIPTURE_READER_OPTIONS_OPEN_EVENT = 'gospel-scripture-reader-options-open'

/** Tour navigates the open reader to a reference without passage-picker mode. */
export const GOSPEL_SCRIPTURE_READER_TOUR_SHOW_REFERENCE_EVENT = 'gospel-scripture-reader-tour-show-reference'

export type ScriptureReaderTourShowReferenceDetail = {
  reference: string
}
