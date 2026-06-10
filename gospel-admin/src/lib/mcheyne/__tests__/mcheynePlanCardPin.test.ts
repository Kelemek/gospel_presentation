import {
  isMcheynePlanScriptureCardOpen,
  shouldUpdateMcheyneReadingProgress,
} from '@/lib/mcheyne/mcheynePlanCardPin'

describe('mcheynePlanCardPin', () => {
  describe('isMcheynePlanScriptureCardOpen', () => {
    it('is true for mchy with real card anchors', () => {
      expect(
        isMcheynePlanScriptureCardOpen('mchy', 'section-may', 'section-may-26')
      ).toBe(true)
    })

    it('is false without explicit anchors', () => {
      expect(isMcheynePlanScriptureCardOpen('mchy', undefined, undefined)).toBe(false)
    })

    it('is false for modal-view anchors', () => {
      expect(
        isMcheynePlanScriptureCardOpen('mchy', 'modal-view', 'modal-view')
      ).toBe(false)
    })

    it('is false on non-mchy profiles', () => {
      expect(
        isMcheynePlanScriptureCardOpen('default', 'section-may', 'section-may-26')
      ).toBe(false)
    })
  })

  describe('shouldUpdateMcheyneReadingProgress', () => {
    it('requires plan card flag on mchy', () => {
      expect(shouldUpdateMcheyneReadingProgress('mchy', true)).toBe(true)
      expect(shouldUpdateMcheyneReadingProgress('mchy', false)).toBe(false)
      expect(shouldUpdateMcheyneReadingProgress('mchy', undefined)).toBe(false)
    })

    it('always allows yellow updates on other profiles', () => {
      expect(shouldUpdateMcheyneReadingProgress('default', undefined)).toBe(true)
    })
  })
})
