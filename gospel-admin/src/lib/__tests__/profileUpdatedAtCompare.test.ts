import {
  isLikelyVisitOnlyTimestampBump,
  profileUpdatedAtMatches,
  profileUpdatedAtMs,
} from '../profileUpdatedAtCompare'

describe('profileUpdatedAtCompare', () => {
  it('matches equivalent ISO strings', () => {
    const a = '2025-05-31T12:00:00.000Z'
    const b = '2025-05-31T12:00:00.000Z'
    expect(profileUpdatedAtMatches(a, b)).toBe(true)
    expect(profileUpdatedAtMs(a)).toBe(profileUpdatedAtMs(b))
  })

  it('rejects different timestamps', () => {
    expect(
      profileUpdatedAtMatches('2025-05-31T12:00:00.000Z', '2025-05-31T12:00:01.000Z')
    ).toBe(false)
  })

  it('detects small forward bumps within grace window', () => {
    expect(
      isLikelyVisitOnlyTimestampBump(
        '2025-05-31T12:00:00.000Z',
        '2025-05-31T12:00:01.000Z',
        15_000
      )
    ).toBe(true)
    expect(
      isLikelyVisitOnlyTimestampBump(
        '2025-05-31T12:00:00.000Z',
        '2025-05-31T12:01:00.000Z',
        15_000
      )
    ).toBe(false)
  })
})
