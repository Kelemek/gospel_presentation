import { GET } from '../route'
import { readDeployUpdateMessage, resolveDeployUpdateChangelog } from '@/lib/deployUpdateMessage'

jest.mock('@/lib/deployUpdateMessage', () => ({
  readDeployUpdateMessage: jest.fn(() => null),
  resolveDeployUpdateChangelog: jest.fn(() => []),
}))

const mockedReadDeployUpdateMessage = jest.mocked(readDeployUpdateMessage)
const mockedResolveDeployUpdateChangelog = jest.mocked(resolveDeployUpdateChangelog)

describe('/api/app-deploy-version route', () => {
  beforeEach(() => {
    mockedReadDeployUpdateMessage.mockReturnValue(null)
    mockedResolveDeployUpdateChangelog.mockReturnValue([])
  })

  it('returns a non-empty version string', async () => {
    const response = await GET()
    const data = await response.json()

    expect(typeof data.version).toBe('string')
    expect(data.version.length).toBeGreaterThan(0)
    expect(data.message).toBeUndefined()
  })

  it('includes message when deploy-update-message.txt has user-visible content', async () => {
    mockedReadDeployUpdateMessage.mockReturnValue('Fixed the Resources menu on iPhone.')

    const response = await GET()
    const data = await response.json()

    expect(data.message).toBe('Fixed the Resources menu on iPhone.')
  })

  it('includes changelog when release notes exist', async () => {
    mockedResolveDeployUpdateChangelog.mockReturnValue([
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
