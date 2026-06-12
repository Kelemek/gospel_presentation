import {
  DEPLOY_UPDATE_MESSAGE_MAX_LENGTH,
  parseDeployUpdateMessageFileContent,
} from '@/lib/deployUpdateMessage'

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
})
