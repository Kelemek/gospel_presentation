import {
  isProfileScriptureCardAnchors,
  scriptureModalUsesHighlightPicker,
} from '@/lib/scriptureModalOpenMode'

const cards = [
  {
    reference: 'John 3:16',
    sectionId: 'section-1',
    subsectionId: 'section-1-0',
  },
]

describe('scriptureModalOpenMode', () => {
  it('isProfileScriptureCardAnchors matches card triple only', () => {
    expect(
      isProfileScriptureCardAnchors('John 3:16', 'section-1', 'section-1-0', cards)
    ).toBe(true)
    expect(
      isProfileScriptureCardAnchors('John 3:16', 'modal-view', 'modal-view', cards)
    ).toBe(false)
    expect(
      isProfileScriptureCardAnchors('John 4:1', 'section-1', 'section-1-0', cards)
    ).toBe(false)
  })

  it('scriptureModalUsesHighlightPicker defaults to highlights for modal-view tabs', () => {
    expect(
      scriptureModalUsesHighlightPicker({
        reference: 'Romans 8:28',
        scriptureCards: cards,
        anchors: {
          reference: 'Romans 8:28',
          sectionId: 'modal-view',
          subsectionId: 'modal-view',
        },
      })
    ).toBe(true)
  })

  it('scriptureModalUsesHighlightPicker uses pins for scripture card anchors', () => {
    expect(
      scriptureModalUsesHighlightPicker({
        reference: 'John 3:16',
        scriptureCards: cards,
        anchors: {
          reference: 'John 3:16',
          sectionId: 'section-1',
          subsectionId: 'section-1-0',
        },
      })
    ).toBe(false)
  })

  it('scriptureModalUsesHighlightPicker honors explicit pickerNavigation', () => {
    expect(
      scriptureModalUsesHighlightPicker({
        reference: 'John 3:16',
        pickerNavigation: true,
        scriptureCards: cards,
        anchors: {
          reference: 'John 3:16',
          sectionId: 'section-1',
          subsectionId: 'section-1-0',
        },
      })
    ).toBe(true)
  })
})
