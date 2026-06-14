import { appendReleaseChangelog } from '@/lib/releaseChangelog'

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => '[]'),
  writeFileSync: jest.fn(),
}))

describe('releaseChangelog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('appendReleaseChangelog writes the same message to both changelog files', () => {
    const fs = jest.requireMock('fs') as {
      readFileSync: jest.Mock
      writeFileSync: jest.Mock
    }

    fs.readFileSync.mockReturnValue('[]')

    const { deployMessage, siteEntry } = appendReleaseChangelog(
      'Open Help (?), then Change log to browse what is new.'
    )

    expect(deployMessage).toBe('Open Help (?), then Change log to browse what is new.')
    expect(siteEntry.message).toBe(deployMessage)
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2)

    const deployWrite = JSON.parse(
      (fs.writeFileSync.mock.calls[0]![1] as string).trim()
    ) as string[]
    const siteWrite = JSON.parse(
      (fs.writeFileSync.mock.calls[1]![1] as string).trim()
    ) as Array<{ message: string }>

    expect(deployWrite).toEqual([deployMessage])
    expect(siteWrite[0]?.message).toBe(deployMessage)
  })

  it('appendReleaseChangelog rejects empty messages', () => {
    expect(() => appendReleaseChangelog('   ')).toThrow(/required/i)
  })
})
