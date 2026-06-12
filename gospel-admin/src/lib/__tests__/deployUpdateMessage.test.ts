import {
  DEPLOY_UPDATE_CHANGELOG_ENTRY_MAX_LENGTH,
  DEPLOY_UPDATE_CHANGELOG_MAX_ENTRIES,
  readDeployUpdateChangelog,
} from '@/lib/deployUpdateMessage'

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
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

  it('readDeployUpdateChangelog keeps only the last five entries', () => {
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
      'Note 2.',
      'Note 3.',
      'Note 4.',
      'Note 5.',
      'Note 6.',
    ])
    expect(readDeployUpdateChangelog()).toHaveLength(DEPLOY_UPDATE_CHANGELOG_MAX_ENTRIES)
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
})
