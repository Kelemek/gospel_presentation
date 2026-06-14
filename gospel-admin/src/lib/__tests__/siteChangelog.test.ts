import {
  groupSiteChangelogByMonth,
  monthYearLabelFromReleasedAt,
  parseSiteChangelogFileContent,
  siteChangelogEntryKey,
} from '@/lib/siteChangelogShared'

describe('siteChangelog', () => {
  it('parseSiteChangelogFileContent parses dated entries', () => {
    expect(
      parseSiteChangelogFileContent(
        JSON.stringify([
          { releasedAt: '2026-06-01', message: 'Older note.' },
          { releasedAt: '2026-06-13', message: 'Newer note.' },
        ])
      )
    ).toEqual([
      { releasedAt: '2026-06-01', message: 'Older note.' },
      { releasedAt: '2026-06-13', message: 'Newer note.' },
    ])
  })

  it('parseSiteChangelogFileContent rejects invalid dates', () => {
    expect(
      parseSiteChangelogFileContent(
        JSON.stringify([{ releasedAt: '06-13-2026', message: 'Bad date.' }])
      )
    ).toEqual([])
  })

  it('groupSiteChangelogByMonth returns newest month and entries first', () => {
    const groups = groupSiteChangelogByMonth([
      { releasedAt: '2026-05-10', message: 'May item.' },
      { releasedAt: '2026-06-01', message: 'June older.' },
      { releasedAt: '2026-06-13', message: 'June newer.' },
    ])
    expect(groups).toEqual([
      {
        label: monthYearLabelFromReleasedAt('2026-06-13'),
        entries: [
          { releasedAt: '2026-06-13', message: 'June newer.' },
          { releasedAt: '2026-06-01', message: 'June older.' },
        ],
      },
      {
        label: monthYearLabelFromReleasedAt('2026-05-10'),
        entries: [{ releasedAt: '2026-05-10', message: 'May item.' }],
      },
    ])
  })

  it('siteChangelogEntryKey differs when committedAt differs on the same day and message', () => {
    const shared = { releasedAt: '2026-06-13', message: 'Same note.' }
    const a = { ...shared, committedAt: '2026-06-14T01:00:00.000Z' }
    const b = { ...shared, committedAt: '2026-06-14T02:00:00.000Z' }
    expect(siteChangelogEntryKey(a)).not.toEqual(siteChangelogEntryKey(b))
  })

  it('groupSiteChangelogByMonth orders same-day entries by committedAt', () => {
    const groups = groupSiteChangelogByMonth([
      {
        releasedAt: '2026-06-13',
        committedAt: '2026-06-14T01:00:00.000Z',
        message: 'Earlier same day.',
      },
      {
        releasedAt: '2026-06-13',
        committedAt: '2026-06-14T02:28:00.000Z',
        message: 'Latest commit.',
      },
      {
        releasedAt: '2026-06-13',
        committedAt: '2026-06-14T02:00:00.000Z',
        message: 'Middle same day.',
      },
    ])
    expect(groups[0]?.entries.map((e) => e.message)).toEqual([
      'Latest commit.',
      'Middle same day.',
      'Earlier same day.',
    ])
  })

})
