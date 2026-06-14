import { GET } from '@/app/api/site-changelog/route'
import { groupSiteChangelogByMonth } from '@/lib/siteChangelog'

jest.mock('@/lib/siteChangelog', () => ({
  readSiteChangelog: jest.fn(() => [
    { releasedAt: '2026-05-10', message: 'May item.' },
    { releasedAt: '2026-06-13', message: 'June newer.' },
    { releasedAt: '2026-06-01', message: 'June older.' },
  ]),
  groupSiteChangelogByMonth: jest.requireActual('@/lib/siteChangelog').groupSiteChangelogByMonth,
}))

describe('GET /api/site-changelog', () => {
  it('returns month-grouped changelog entries', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    const data = (await response.json()) as { groups: ReturnType<typeof groupSiteChangelogByMonth> }
    expect(data.groups.length).toBeGreaterThan(0)
    expect(data.groups[0]?.entries[0]?.message).toBe('June newer.')
  })
})
