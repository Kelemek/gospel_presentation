import {
  findScriptureCardInList,
  indexOfScriptureCardInList,
  isProfileScriptureCardAnchors,
  scriptureCardReferencesMatch,
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

  it('isProfileScriptureCardAnchors matches when card ref uses en-dash and click uses hyphen', () => {
    const enDashCards = [
      {
        reference: 'John 3:16–18',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
      },
    ]
    expect(
      isProfileScriptureCardAnchors('John 3:16-18', 'section-1', 'section-1-0', enDashCards)
    ).toBe(true)
    expect(
      scriptureModalUsesHighlightPicker({
        reference: 'John 3:16-18',
        scriptureCards: enDashCards,
        anchors: {
          reference: 'John 3:16–18',
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

  it('indexOfScriptureCardInList matches en-dash card when lookup uses hyphen', () => {
    const enDashCards = [
      {
        reference: 'John 3:16–18',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
      },
      {
        reference: 'Romans 8:28',
        sectionId: 'section-1',
        subsectionId: 'section-1-1',
      },
    ]
    expect(indexOfScriptureCardInList('John 3:16-18', enDashCards)).toBe(0)
    expect(findScriptureCardInList('John 3:16-18', enDashCards)?.reference).toBe('John 3:16–18')
    expect(scriptureCardReferencesMatch('John 3:16–18', 'John 3:16-18')).toBe(true)
  })
})
