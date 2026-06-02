import {
  lastOpenScriptureDisplayParts,
  lastOpenScriptureMenuTitle,
} from '../lastOpenScriptureLabel'

describe('lastOpenScriptureLabel', () => {
  it('lastOpenScriptureMenuTitle appends uppercase translation code', () => {
    expect(lastOpenScriptureMenuTitle('John 3:16', 'kjv')).toBe('John 3:16 · KJV')
    expect(lastOpenScriptureMenuTitle('John 3:16')).toBe('John 3:16')
  })

  it('lastOpenScriptureDisplayParts splits book and verse suffix', () => {
    expect(lastOpenScriptureDisplayParts('Galatians 2:16')).toEqual({
      book: 'Galatians',
      referenceSuffix: '2:16',
    })
  })
})
