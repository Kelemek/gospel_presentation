import * as fromPublic from '@/lib/profileHelpTours'
import * as fromIndex from '@/lib/profileHelpTours/index'

describe('profileHelpTours public entry', () => {
  it('re-exports the implementation module (barrel matches index)', () => {
    expect(fromPublic.runFullProfileHelpTutorial).toBe(fromIndex.runFullProfileHelpTutorial)
    expect(fromPublic.parseMarriageSeminarTourResumeStorageValue).toBe(
      fromIndex.parseMarriageSeminarTourResumeStorageValue
    )
    expect(fromPublic.scriptureReaderTourNavigation).toBe(fromIndex.scriptureReaderTourNavigation)
    expect(fromPublic.applyProfileHelpTourPopoverSafeAreaNudge).toBe(
      fromIndex.applyProfileHelpTourPopoverSafeAreaNudge
    )
  })
})
