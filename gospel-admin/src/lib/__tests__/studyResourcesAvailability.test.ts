import { studyResourcesAvailableFromPayload } from '@/lib/studyResourcesAvailability'

describe('studyResourcesAvailableFromPayload', () => {
  it('returns true when cross references exist', () => {
    expect(
      studyResourcesAvailableFromPayload({
        sermonCount: 0,
        crossRefCount: 3,
      })
    ).toBe(true)
  })

  it('returns true when indexed corpora exist', () => {
    expect(
      studyResourcesAvailableFromPayload({
        sermonCount: 1,
        crossRefCount: 0,
      })
    ).toBe(true)
  })

  it('returns false when nothing is available', () => {
    expect(studyResourcesAvailableFromPayload({})).toBe(false)
  })
})
