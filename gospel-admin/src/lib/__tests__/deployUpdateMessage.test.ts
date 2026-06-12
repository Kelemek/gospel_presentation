import {
  DEPLOY_UPDATE_MESSAGE_MAX_LENGTH,
  parseDeployUpdateMessageFileContent,
  resolveDeployUpdateChangelog,
} from '@/lib/deployUpdateMessage'

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(),
}))

describe('deployUpdateMessage', () => {
  it('parseDeployUpdateMessageFileContent strips comment lines and trims', () => {
    const raw = `# header comment

Fixed the Resources menu on iPhone.
`
    expect(parseDeployUpdateMessageFileContent(raw)).toBe(
      'Fixed the Resources menu on iPhone.'
    )
  })

  it('parseDeployUpdateMessageFileContent returns null when only comments or whitespace', () => {
    expect(parseDeployUpdateMessageFileContent('# only comments\n')).toBeNull()
    expect(parseDeployUpdateMessageFileContent('   \n\n  ')).toBeNull()
  })

  it('parseDeployUpdateMessageFileContent truncates long messages', () => {
    const long = 'a'.repeat(DEPLOY_UPDATE_MESSAGE_MAX_LENGTH + 10)
    const parsed = parseDeployUpdateMessageFileContent(long)
    expect(parsed).not.toBeNull()
    expect(parsed!.length).toBeLessThanOrEqual(DEPLOY_UPDATE_MESSAGE_MAX_LENGTH)
    expect(parsed!.endsWith('…')).toBe(true)
  })

  it('resolveDeployUpdateChangelog appends the current deploy message when it is new', () => {
    const fs = jest.requireMock('fs') as {
      existsSync: jest.Mock
      readFileSync: jest.Mock
    }

    fs.existsSync.mockImplementation((filePath: string) =>
      String(filePath).endsWith('deploy-update-changelog.json') ||
      String(filePath).endsWith('deploy-update-message.txt')
    )
    fs.readFileSync.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith('deploy-update-changelog.json')) {
        return JSON.stringify(['Older release note.'])
      }
      return 'Brand-new release note.'
    })

    expect(resolveDeployUpdateChangelog()).toEqual([
      'Older release note.',
      'Brand-new release note.',
    ])
  })
})
