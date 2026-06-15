import {
  appendDeployUpdateChangelogEntry,
  DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH,
  readDeployUpdateChangelog,
} from '@/lib/deployUpdateMessage'

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}))

describe('deployUpdateMessage', () => {
  it('readDeployUpdateChangelog parses a JSON string array', () => {
    const fs = jest.requireMock('fs') as {
      existsSync: jest.Mock
      readFileSync: jest.Mock
    }

    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue(
      JSON.stringify([
        'Older release note.',
        'Fixed the Resources menu on iPhone.',
      ])
    )

    expect(readDeployUpdateChangelog()).toEqual([
      'Older release note.',
      'Fixed the Resources menu on iPhone.',
    ])
  })

  it('readDeployUpdateChangelog returns every entry in the file (append-only)', () => {
    const fs = jest.requireMock('fs') as {
      existsSync: jest.Mock
      readFileSync: jest.Mock
    }

    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue(
      JSON.stringify([
        'Note 1.',
        'Note 2.',
        'Note 3.',
        'Note 4.',
        'Note 5.',
        'Note 6.',
      ])
    )

    expect(readDeployUpdateChangelog()).toEqual([
      'Note 1.',
      'Note 2.',
      'Note 3.',
      'Note 4.',
      'Note 5.',
      'Note 6.',
    ])
    expect(readDeployUpdateChangelog()).toHaveLength(6)
  })

  it('readDeployUpdateChangelog truncates long entries', () => {
    const fs = jest.requireMock('fs') as {
      existsSync: jest.Mock
      readFileSync: jest.Mock
    }

    const long = 'a'.repeat(DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH + 10)
    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockReturnValue(JSON.stringify([long]))

    const changelog = readDeployUpdateChangelog()
    expect(changelog).toHaveLength(1)
    expect(changelog[0]!.length).toBeLessThanOrEqual(DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH)
    expect(changelog[0]!.endsWith('…')).toBe(true)
  })

  it('appendDeployUpdateChangelogEntry only grows the array (never trims)', () => {
    const fs = jest.requireMock('fs') as {
      existsSync: jest.Mock
      readFileSync: jest.Mock
      writeFileSync: jest.Mock
    }

    const stored: string[] = ['Older release note.', 'Fixed the Resources menu on iPhone.']
    fs.existsSync.mockReturnValue(true)
    fs.readFileSync.mockImplementation(() => JSON.stringify(stored))
    fs.writeFileSync.mockImplementation((_path: string, raw: string) => {
      const parsed = JSON.parse(raw) as string[]
      stored.length = 0
      stored.push(...parsed)
    })

    appendDeployUpdateChangelogEntry('New books library entry.')

    expect(stored).toEqual([
      'Older release note.',
      'Fixed the Resources menu on iPhone.',
      'New books library entry.',
    ])
    expect(fs.writeFileSync).toHaveBeenCalled()
  })
})
