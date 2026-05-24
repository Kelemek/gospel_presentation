import {
  isPilgrimProgressProfileSlug,
  PILGRIM_PROGRESS_SLUG,
  pilgrimProgressProfileTitle,
} from '@/lib/pilgrim/pilgrimSlug'

describe('pilgrimSlug', () => {
  it('recognizes ppgr slug', () => {
    expect(isPilgrimProgressProfileSlug('ppgr')).toBe(true)
    expect(isPilgrimProgressProfileSlug('sg00001')).toBe(false)
  })

  it('provides profile title', () => {
    expect(pilgrimProgressProfileTitle()).toContain('Pilgrim')
    expect(PILGRIM_PROGRESS_SLUG).toBe('ppgr')
  })
})
