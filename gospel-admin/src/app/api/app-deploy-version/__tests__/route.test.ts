import { GET } from '../route'
import { readDeployUpdateChangelog } from '@/lib/deployUpdateMessage'

jest.mock('@/lib/deployUpdateMessage', () => ({
  readDeployUpdateChangelog: jest.fn(() => []),
}))

const mockedReadDeployUpdateChangelog = jest.mocked(readDeployUpdateChangelog)

describe('/api/app-deploy-version route', () => {
  beforeEach(() => {
    mockedReadDeployUpdateChangelog.mockReturnValue([])
  })

  it('returns a non-empty version string', async () => {
    const response = await GET()
    const data = await response.json()

    expect(typeof data.version).toBe('string')
    expect(data.version.length).toBeGreaterThan(0)
    expect(data.changelog).toBeUndefined()
  })

  it('includes changelog when release notes exist', async () => {
    mockedReadDeployUpdateChangelog.mockReturnValue([
      'Older release note.',
      'Fixed the Resources menu on iPhone.',
    ])

    const response = await GET()
    const data = await response.json()

    expect(data.changelog).toEqual([
      'Older release note.',
      'Fixed the Resources menu on iPhone.',
    ])
  })
})
