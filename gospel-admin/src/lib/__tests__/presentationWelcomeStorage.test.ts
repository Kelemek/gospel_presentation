import {
  PRESENTATION_FIRST_VISIT_WELCOME_KEY,
  dismissPresentationWelcome,
  hasPresentationWelcomeBeenDismissed,
} from '@/lib/presentationWelcomeStorage'

describe('presentationWelcomeStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hasPresentationWelcomeBeenDismissed is false before dismiss', () => {
    expect(hasPresentationWelcomeBeenDismissed()).toBe(false)
  })

  it('hasPresentationWelcomeBeenDismissed is true after dismiss', () => {
    dismissPresentationWelcome()
    expect(hasPresentationWelcomeBeenDismissed()).toBe(true)
    expect(localStorage.getItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY)).toBe('1')
  })
})
