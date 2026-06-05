import { isReimportableCorpusProfileSlug } from '@/lib/backup/reimportableCorpusProfileSlug'

describe('isReimportableCorpusProfileSlug', () => {
  it('matches CCEL corpus prefixes', () => {
    expect(isReimportableCorpusProfileSlug('sg00042')).toBe(true)
    expect(isReimportableCorpusProfileSlug('me0315')).toBe(true)
    expect(isReimportableCorpusProfileSlug('cvrom')).toBe(true)
    expect(isReimportableCorpusProfileSlug('mhgen')).toBe(true)
    expect(isReimportableCorpusProfileSlug('je01')).toBe(true)
    expect(isReimportableCorpusProfileSlug('lgal')).toBe(true)
    expect(isReimportableCorpusProfileSlug('ltbw')).toBe(true)
    expect(isReimportableCorpusProfileSlug('aogr')).toBe(true)
    expect(isReimportableCorpusProfileSlug('bxrp')).toBe(true)
    expect(isReimportableCorpusProfileSlug('jryh')).toBe(true)
    expect(isReimportableCorpusProfileSlug('jefow')).toBe(true)
    expect(isReimportableCorpusProfileSlug('jerea')).toBe(true)
    expect(isReimportableCorpusProfileSlug('jetog')).toBe(true)
    expect(isReimportableCorpusProfileSlug('twbd')).toBe(true)
    expect(isReimportableCorpusProfileSlug('luthergal')).toBe(true)
  })

  it('does not match user or template profiles', () => {
    expect(isReimportableCorpusProfileSlug('default')).toBe(false)
    expect(isReimportableCorpusProfileSlug('marriage-biblical-perspective')).toBe(false)
    expect(isReimportableCorpusProfileSlug('physical-intimacy')).toBe(false)
    expect(isReimportableCorpusProfileSlug('')).toBe(false)
  })
})
