import {
  PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX,
  PROFILE_MENU_LABEL_MIN_VIEWPORT_PX,
  profileMenuLabelMinViewportPx,
  showProfileMenuLabelForViewport,
} from '../profileHeaderMenuLabel'

describe('profileMenuLabelMinViewportPx', () => {
  it('uses the lower threshold on Android (no Listen control)', () => {
    expect(profileMenuLabelMinViewportPx(true)).toBe(PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX)
    expect(profileMenuLabelMinViewportPx(false)).toBe(PROFILE_MENU_LABEL_MIN_VIEWPORT_PX)
  })
})

describe('showProfileMenuLabelForViewport', () => {
  describe('non-Android', () => {
    it('hides the word Menu when viewport is under 390px', () => {
      expect(showProfileMenuLabelForViewport(389, false)).toBe(false)
      expect(showProfileMenuLabelForViewport(0, false)).toBe(false)
    })

    it('shows the word Menu at 390px and wider', () => {
      expect(showProfileMenuLabelForViewport(PROFILE_MENU_LABEL_MIN_VIEWPORT_PX, false)).toBe(true)
      expect(showProfileMenuLabelForViewport(800, false)).toBe(true)
    })

    it('hides at 360px where Android would still show', () => {
      expect(showProfileMenuLabelForViewport(360, false)).toBe(false)
    })
  })

  describe('Android', () => {
    it('hides the word Menu when viewport is under 360px', () => {
      expect(showProfileMenuLabelForViewport(359, true)).toBe(false)
      expect(showProfileMenuLabelForViewport(0, true)).toBe(false)
    })

    it('shows the word Menu at 360px and wider', () => {
      expect(showProfileMenuLabelForViewport(PROFILE_MENU_LABEL_MIN_VIEWPORT_ANDROID_PX, true)).toBe(true)
      expect(showProfileMenuLabelForViewport(800, true)).toBe(true)
    })
  })

  it('defaults isAndroidUserAgent to false', () => {
    expect(showProfileMenuLabelForViewport(389)).toBe(false)
    expect(showProfileMenuLabelForViewport(390)).toBe(true)
  })
})
