/** @jest-environment jsdom */

import type { ProfileReadingResumeV1 } from '@/lib/profileReadingResumeStorage'
import {
  shouldDeferToStudyOrHashNavigation,
  shouldRestoreStoredReadingResumeAtScrollY,
  shouldSkipStoredReadingResumeRestore,
} from '@/lib/profileReadingResumeRestoreGuards'

const resume: ProfileReadingResumeV1 = {
  v: 1,
  anchorId: 'section-1-0',
  plainOffset: 40,
  fingerprint: 'fp-test',
}

const baseContext = {
  profileSlug: 'default',
  sectionCount: 3,
  selectedScriptureIsOpen: false,
  studyRefParam: '',
  mcheynePlanDayParam: '',
  mcheyneResumePinParam: '',
  locationHash: '',
}

describe('shouldSkipStoredReadingResumeRestore', () => {
  it('skips when scripture modal is open or studyRef is set', () => {
    expect(
      shouldSkipStoredReadingResumeRestore({
        ...baseContext,
        selectedScriptureIsOpen: true,
      })
    ).toBe(true)
    expect(
      shouldSkipStoredReadingResumeRestore({
        ...baseContext,
        studyRefParam: 'Romans 8:1',
      })
    ).toBe(true)
  })

  it('skips section hash navigation targets', () => {
    expect(
      shouldSkipStoredReadingResumeRestore({
        ...baseContext,
        locationHash: 'section-foo',
      })
    ).toBe(true)
  })

  it('allows restore for a normal profile at top of page', () => {
    expect(shouldSkipStoredReadingResumeRestore(baseContext)).toBe(false)
  })
})

describe('shouldDeferToStudyOrHashNavigation', () => {
  it('defers when studyRef or section hash is present', () => {
    expect(
      shouldDeferToStudyOrHashNavigation({
        profileSlug: 'default',
        studyRefParam: 'John 3:16',
        mcheynePlanDayParam: '',
        mcheyneResumePinParam: '',
        locationHash: '',
      })
    ).toBe(true)
    expect(
      shouldDeferToStudyOrHashNavigation({
        profileSlug: 'default',
        studyRefParam: '',
        mcheynePlanDayParam: '',
        mcheyneResumePinParam: '',
        locationHash: 'section-1-0',
      })
    ).toBe(true)
  })
})

describe('shouldRestoreStoredReadingResumeAtScrollY', () => {
  it('restores at scroll top without comparing viewport position', () => {
    expect(
      shouldRestoreStoredReadingResumeAtScrollY(
        resume,
        [{ id: 's1', title: 'S', subsections: [] } as never],
        'default',
        0
      )
    ).toBe(true)
  })

  it('does not restore mid-page unless allowWhenAheadOfViewport is set', () => {
    expect(
      shouldRestoreStoredReadingResumeAtScrollY(
        resume,
        [{ id: 's1', title: 'S', subsections: [] } as never],
        'default',
        200
      )
    ).toBe(false)
  })
})
