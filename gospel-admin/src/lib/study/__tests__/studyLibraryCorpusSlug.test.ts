import { isStudyLibraryCorpusProfileSlug } from '@/lib/study/studyLibraryCorpusSlug'

describe('isStudyLibraryCorpusProfileSlug', () => {
  it('matches library corpora only', () => {
    expect(isStudyLibraryCorpusProfileSlug('sg00001')).toBe(true)
    expect(isStudyLibraryCorpusProfileSlug('je01')).toBe(true)
    expect(isStudyLibraryCorpusProfileSlug('me0101')).toBe(true)
    expect(isStudyLibraryCorpusProfileSlug('cvGEN')).toBe(true)
    expect(isStudyLibraryCorpusProfileSlug('mhgen')).toBe(true)
    expect(isStudyLibraryCorpusProfileSlug('lbst')).toBe(false)
    expect(isStudyLibraryCorpusProfileSlug('ppgr')).toBe(false)
    expect(isStudyLibraryCorpusProfileSlug('aogr')).toBe(false)
    expect(isStudyLibraryCorpusProfileSlug('twcm')).toBe(false)
  })
})
