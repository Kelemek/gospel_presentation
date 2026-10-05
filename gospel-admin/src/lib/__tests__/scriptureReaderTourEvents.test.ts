import {
  GOSPEL_SCRIPTURE_READER_OPTIONS_OPEN_EVENT,
  GOSPEL_SCRIPTURE_READER_TOUR_SHOW_REFERENCE_EVENT,
} from '@/lib/scriptureReaderTourEvents'
import {
  navigateScriptureForTour,
  openScriptureReaderOptionsForTour,
} from '@/lib/profileHelpTours/tourSharedDomHelpers'

describe('scripture reader tour events', () => {
  it('dispatches tour navigation with reference detail', () => {
    const handler = jest.fn()
    window.addEventListener(GOSPEL_SCRIPTURE_READER_TOUR_SHOW_REFERENCE_EVENT, handler)
    navigateScriptureForTour('John 14:6')
    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0] as CustomEvent<{ reference: string }>
    expect(event.detail.reference).toBe('John 14:6')
    window.removeEventListener(GOSPEL_SCRIPTURE_READER_TOUR_SHOW_REFERENCE_EVENT, handler)
  })

  it('dispatches open reader display for tour', () => {
    const handler = jest.fn()
    window.addEventListener(GOSPEL_SCRIPTURE_READER_OPTIONS_OPEN_EVENT, handler)
    openScriptureReaderOptionsForTour()
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(GOSPEL_SCRIPTURE_READER_OPTIONS_OPEN_EVENT, handler)
  })
})
