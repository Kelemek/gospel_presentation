import { collectScriptureReferencesForSubsection } from '@/lib/scriptureReferencesFromHtml'

describe('collectScriptureReferencesForSubsection', () => {
  it('collects scripRef from ThML and dedupes with plain-text scan', () => {
    const thml = `<p>See <scripRef passage="Rom 8:28" parsed="|Rom|8|28|0|0" /> and again Rom 8:28.</p>`
    const contentHtml = '<p>See Romans 8:28 and again Romans 8:28.</p>'
    const cards = collectScriptureReferencesForSubsection({ thmlInner: thml, contentHtml })
    expect(cards).toHaveLength(1)
    expect(cards[0].reference).toBe('Romans 8:28')
    expect(cards[0].favorite).toBe(false)
  })

  it('includes refs from subsection title', () => {
    const cards = collectScriptureReferencesForSubsection({
      contentHtml: '<p>Body</p>',
      title: 'Intro — John 3:16',
    })
    expect(cards.map((c) => c.reference)).toEqual(['John 3:16'])
  })

  it('splits non-contiguous comma scripRef lists into separate cards', () => {
    const thml = `<p><scripRef passage="Eph 2:1" /> and <scripRef passage="Eph 2:5" /></p>`
    const contentHtml =
      '<p>See Ephesians 2:1 and Ephesians 2:5.</p>'
    const cards = collectScriptureReferencesForSubsection({
      thmlInner: thml,
      contentHtml,
    })
    expect(cards.map((c) => c.reference)).toEqual(['Ephesians 2:1', 'Ephesians 2:5'])
  })

  it('splits a single non-contiguous comma passage into separate cards', () => {
    const thml = `<p><scripRef passage="Eph 2:1,5" parsed="|Eph|2|1|0|0" /></p>`
    const contentHtml = '<p>See Ephesians 2:1; Ephesians 2:5.</p>'
    const cards = collectScriptureReferencesForSubsection({ thmlInner: thml, contentHtml })
    expect(cards.map((c) => c.reference)).toEqual(['Ephesians 2:1', 'Ephesians 2:5'])
  })
  it('skips non-canonical strings', () => {
    const cards = collectScriptureReferencesForSubsection({
      contentHtml: '<p>Not a verse: foo bar baz.</p>',
    })
    expect(cards).toEqual([])
  })
})
