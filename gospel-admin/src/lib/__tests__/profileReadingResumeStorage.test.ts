import { gospelStorageGetSync } from '@/lib/gospelClientStorage'
import { installTestLocalStorage, resetGospelStorageTestState } from '@/lib/testing/testLocalStorage'
import {
  clearProfileReadingResume,
  loadProfileReadingResume,
  profileReadingResumeStorageKey,
  saveProfileReadingResume,
} from '../profileReadingResumeStorage'

describe('profileReadingResumeStorage', () => {
  beforeEach(async () => {
    await resetGospelStorageTestState()
    installTestLocalStorage()
  })

  it('saves and loads reading resume per slug', () => {
    saveProfileReadingResume('slug-a', 'section-1-0', 42, 'fp1')
    expect(loadProfileReadingResume('slug-a')).toEqual({
      v: 1,
      anchorId: 'section-1-0',
      plainOffset: 42,
      fingerprint: 'fp1',
    })
    expect(loadProfileReadingResume('other')).toBeNull()
  })

  it('clearProfileReadingResume removes the key', () => {
    saveProfileReadingResume('x', 'section-1', 1, 'f')
    clearProfileReadingResume('x')
    expect(gospelStorageGetSync(profileReadingResumeStorageKey('x'))).toBeNull()
    expect(loadProfileReadingResume('x')).toBeNull()
  })
})
