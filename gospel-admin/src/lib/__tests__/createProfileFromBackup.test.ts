import { restoreNewProfileFromBackupFile } from '../createProfileFromBackup'

describe('restoreNewProfileFromBackupFile', () => {
  const minimalGospelData = [
    {
      section: '1',
      title: 'Section',
      subsections: [{ title: 'Sub', content: '<p>x</p>' }],
    },
  ]

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('creates a profile from backup JSON and returns slug and message', async () => {
    const json = {
      profile: {
        title: 'Source',
        slug: 'unused-slug',
        description: 'd',
        gospelData: minimalGospelData,
      },
    }
    const file = {
      async text() {
        return JSON.stringify(json)
      },
    } as File

    ;(global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const method = init?.method ?? 'GET'
        if (url.includes('/api/profiles/unused-slug') && method === 'GET') {
          return Promise.resolve({ ok: false, status: 404, json: async () => ({}) })
        }
        if (url.endsWith('/api/profiles') && method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ profile: { slug: 'newslug' } }),
          })
        }
        if (url.includes('/api/profiles/newslug') && method === 'PUT') {
          return Promise.resolve({ ok: true, json: async () => ({}) })
        }
        return Promise.resolve({ ok: false, json: async () => ({}) })
      }
    )

    const result = await restoreNewProfileFromBackupFile(file)

    expect(result.newSlug).toBe('newslug')
    expect(result.originalTitle).toBe('Source')
    expect(result.message).toContain('newslug')
    expect(global.fetch).toHaveBeenCalled()
  })

  it('throws on invalid JSON shape', async () => {
    const file = {
      async text() {
        return JSON.stringify({ foo: 1 })
      },
    } as File
    await expect(restoreNewProfileFromBackupFile(file)).rejects.toThrow(/Invalid backup file format/)
  })
})
