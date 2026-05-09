import {
  clearAllProfileReadAlongProgressForSlug,
  clearProfileReadAlongProgress,
  loadProfileReadAlongLastSession,
  loadProfileReadAlongProgress,
  readAlongLastSessionStorageKey,
  readAlongProgressStorageKey,
  readAlongTextFingerprint,
  saveProfileReadAlongLastSession,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'
import type { GospelSection } from '@/lib/types'

describe('profileReadAlongProgressStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('save/load round-trip', () => {
    const fp = readAlongTextFingerprint('hello world')
    saveProfileReadAlongProgress('my-slug', 'section-1-0', 5, fp)
    expect(loadProfileReadAlongProgress('my-slug', 'section-1-0')).toEqual({
      v: 1,
      plainOffset: 5,
      fingerprint: fp,
    })
  })

  it('clear removes key', () => {
    saveProfileReadAlongProgress('s', 'a', 1, 'fp')
    clearProfileReadAlongProgress('s', 'a')
    expect(loadProfileReadAlongProgress('s', 'a')).toBeNull()
  })

  it('clear removes last-session pointer when it matches the cleared anchor', () => {
    saveProfileReadAlongLastSession('s', 'section-1', 9, 'fp')
    clearProfileReadAlongProgress('s', 'section-1')
    expect(loadProfileReadAlongLastSession('s')).toBeNull()
  })

  it('clear per-anchor does not remove last-session when last points at another anchor', () => {
    saveProfileReadAlongLastSession('s', 'section-2', 40, 'fp2')
    saveProfileReadAlongProgress('s', 'section-1', 1, 'fp1')
    clearProfileReadAlongProgress('s', 'section-1')
    expect(loadProfileReadAlongLastSession('s')).toEqual({
      v: 1,
      anchorId: 'section-2',
      plainOffset: 40,
      fingerprint: 'fp2',
    })
  })

  it('last-session save/load round-trip', () => {
    saveProfileReadAlongLastSession('slug', 'section-3', 12, 'fp')
    expect(loadProfileReadAlongLastSession('slug')).toEqual({
      v: 1,
      anchorId: 'section-3',
      plainOffset: 12,
      fingerprint: 'fp',
    })
  })

  it('uses distinct keys per slug and anchor', () => {
    saveProfileReadAlongProgress('a', 'x', 1, 'f1')
    saveProfileReadAlongProgress('b', 'x', 2, 'f2')
    expect(readAlongProgressStorageKey('a', 'x')).not.toBe(readAlongProgressStorageKey('b', 'x'))
    expect(loadProfileReadAlongProgress('a', 'x')?.plainOffset).toBe(1)
    expect(loadProfileReadAlongProgress('b', 'x')?.plainOffset).toBe(2)
  })

  it('last-session key is per slug only', () => {
    expect(readAlongLastSessionStorageKey('a')).not.toBe(readAlongLastSessionStorageKey('b'))
  })

  const minimalSections: GospelSection[] = [
    {
      section: '1',
      title: 'One',
      subsections: [
        { title: 'A', content: 'x', questions: [] },
        { title: 'B', content: 'y', questions: [] },
      ],
    },
  ]

  it('clearAllProfileReadAlongProgressForSlug removes last session and every anchor key', () => {
    saveProfileReadAlongLastSession('slug', 'section-1-0', 3, 'fp0')
    saveProfileReadAlongProgress('slug', 'section-1', 1, 'fpS')
    saveProfileReadAlongProgress('slug', 'section-1-0', 2, 'fpA')
    saveProfileReadAlongProgress('slug', 'section-1-1', 4, 'fpB')
    clearAllProfileReadAlongProgressForSlug('slug', minimalSections)
    expect(loadProfileReadAlongLastSession('slug')).toBeNull()
    expect(loadProfileReadAlongProgress('slug', 'section-1')).toBeNull()
    expect(loadProfileReadAlongProgress('slug', 'section-1-0')).toBeNull()
    expect(loadProfileReadAlongProgress('slug', 'section-1-1')).toBeNull()
  })
})
