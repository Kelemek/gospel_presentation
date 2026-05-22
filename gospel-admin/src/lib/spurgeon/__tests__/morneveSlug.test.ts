import {
  firstWeekdayOfMonth,
  isMorneveProfileSlug,
  morneveLibraryMenuTitle,
  morneveSlugForLocalDate,
  morneveSlugForMmdd,
  morneveTitleForMmdd,
  morneveMmddFromDiv2Id,
} from '@/lib/spurgeon/morneveSlug'

describe('morneveSlug', () => {
  it('isMorneveProfileSlug matches me + MMDD', () => {
    expect(isMorneveProfileSlug('me0101')).toBe(true)
    expect(isMorneveProfileSlug('me0229')).toBe(true)
    expect(isMorneveProfileSlug('sg00001')).toBe(false)
    expect(isMorneveProfileSlug('me')).toBe(false)
  })

  it('morneveTitleForMmdd formats month and day', () => {
    expect(morneveTitleForMmdd('0315')).toBe('March 15')
    expect(morneveTitleForMmdd('1225')).toBe('December 25')
  })

  it('morneveMmddFromDiv2Id parses ThML ids', () => {
    expect(morneveMmddFromDiv2Id('d0101am')).toBe('0101')
    expect(morneveMmddFromDiv2Id('d0229pm')).toBe('0229')
    expect(morneveMmddFromDiv2Id('january')).toBe(null)
  })

  it('morneveSlugForMmdd builds slug', () => {
    expect(morneveSlugForMmdd('0101')).toBe('me0101')
  })

  it('morneveSlugForLocalDate maps Feb 28 to me0229 on non-leap years', () => {
    const slug = morneveSlugForLocalDate(new Date(2025, 1, 28))
    expect(slug).toBe('me0229')
  })

  it('morneveSlugForLocalDate uses actual Feb 29 on leap years', () => {
    const slug = morneveSlugForLocalDate(new Date(2024, 1, 29))
    expect(slug).toBe('me0229')
  })

  it('firstWeekdayOfMonth depends on year (March 1)', () => {
    expect(firstWeekdayOfMonth(2024, 2)).toBe(5) // Friday
    expect(firstWeekdayOfMonth(2025, 2)).toBe(6) // Saturday
    expect(firstWeekdayOfMonth(2026, 2)).not.toBe(firstWeekdayOfMonth(2024, 2))
  })

  it('morneveLibraryMenuTitle maps legacy defaults and keeps custom titles', () => {
    expect(morneveLibraryMenuTitle(undefined)).toBe("Spurgeon's Morning & Evening")
    expect(morneveLibraryMenuTitle('Morning and Evening Devotions')).toBe(
      "Spurgeon's Morning & Evening"
    )
    expect(morneveLibraryMenuTitle("Spurgeon's Morning and Evening")).toBe(
      "Spurgeon's Morning & Evening"
    )
    expect(morneveLibraryMenuTitle('My custom label')).toBe('My custom label')
  })
})
