import { assignYellowLastViewed, loadVersePins } from '@/lib/versePinStorage'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { loadMcheyneYellowPinForResume } from '@/lib/mcheyne/mcheyneResumeYellowPin'

jest.mock('@/lib/versePinStorage', () => {
  const actual = jest.requireActual('@/lib/versePinStorage')
  return {
    ...actual,
    hydrateVersePinsFromStorage: jest.fn(async (slug: string) => actual.loadVersePins(slug)),
  }
})

beforeEach(() => {
  resetGospelClientStorageForTests()
  installTestLocalStorage()
})

describe('loadMcheyneYellowPinForResume', () => {
  it('returns yellow pin stored under mchy even when another profile has no pin', async () => {
    assignYellowLastViewed('mchy', {
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-1',
    })
    expect(loadVersePins('default').yellow).toBeNull()

    const yellow = await loadMcheyneYellowPinForResume()
    expect(yellow?.subsectionId).toBe('section-jan-1')
  })

  it('returns null when mchy has no yellow pin', async () => {
    expect(await loadMcheyneYellowPinForResume()).toBeNull()
  })
})
