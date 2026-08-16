import {
  closestElement,
  isInsideHighlightIgnoredMount,
  isVerseBookmarkColorId,
  resolveScriptureCardAnchors,
  versePinSlotEntryFromModalPinKey,
} from '@/lib/profileContentDomHelpers'

describe('profileContentDomHelpers', () => {
  it('versePinSlotEntryFromModalPinKey parses modal pin keys', () => {
    expect(versePinSlotEntryFromModalPinKey('John 3:16|section-1|section-1-0')).toEqual({
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
    expect(versePinSlotEntryFromModalPinKey('bad')).toBeNull()
  })

  it('isVerseBookmarkColorId excludes yellow', () => {
    expect(isVerseBookmarkColorId('red')).toBe(true)
    expect(isVerseBookmarkColorId('yellow')).toBe(false)
  })

  it('resolveScriptureCardAnchors prefers explicit anchors, then pinned, then lookup', () => {
    const sections = [
      {
        section: '1',
        title: 'God',
        subsections: [
          {
            title: 'Holy',
            content: 'x',
            scriptureReferences: [{ reference: 'Isaiah 6:3', favorite: false }],
          },
        ],
      },
    ] as never

    expect(
      resolveScriptureCardAnchors({
        reference: 'Isaiah 6:3',
        sections,
        explicit: { sectionId: 'explicit', subsectionId: 'sub' },
      })
    ).toEqual({
      reference: 'Isaiah 6:3',
      sectionId: 'explicit',
      subsectionId: 'sub',
    })

    expect(
      resolveScriptureCardAnchors({
        reference: 'Isaiah 6:3',
        sections,
        pinnedAnchors: {
          reference: 'Isaiah 6:3',
          sectionId: 'pinned',
          subsectionId: 'pin-sub',
        },
      })
    ).toEqual({
      reference: 'Isaiah 6:3',
      sectionId: 'pinned',
      subsectionId: 'pin-sub',
    })

    expect(
      resolveScriptureCardAnchors({
        reference: 'Isaiah 6:3',
        sections,
      })
    ).toEqual({
      reference: 'Isaiah 6:3',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
  })

  it('isInsideHighlightIgnoredMount detects gospel mount nodes', () => {
    document.body.innerHTML =
      '<div data-gospel-mount><span id="inner">x</span></div><p data-highlight-scope><span id="ok">y</span></p>'
    const inner = document.getElementById('inner')!
    const ok = document.getElementById('ok')!
    expect(isInsideHighlightIgnoredMount(inner)).toBe(true)
    expect(isInsideHighlightIgnoredMount(ok)).toBe(false)
    expect(closestElement(ok, '[data-highlight-scope]')?.getAttribute('data-highlight-scope')).toBe(
      ''
    )
  })
})
