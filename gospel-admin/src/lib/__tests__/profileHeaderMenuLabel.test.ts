import {
  PROFILE_MENU_LABEL_MIN_VIEWPORT_PX,
  showProfileMenuLabelForViewport,
} from '../profileHeaderMenuLabel'

describe('showProfileMenuLabelForViewport', () => {
  it('hides the word Menu when viewport is under 390px', () => {
    expect(showProfileMenuLabelForViewport(389)).toBe(false)
    expect(showProfileMenuLabelForViewport(0)).toBe(false)
  })

  it('shows the word Menu at 390px and wider', () => {
    expect(showProfileMenuLabelForViewport(PROFILE_MENU_LABEL_MIN_VIEWPORT_PX)).toBe(true)
    expect(showProfileMenuLabelForViewport(800)).toBe(true)
  })
})
