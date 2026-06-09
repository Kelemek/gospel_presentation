import fs from 'fs'
import path from 'path'

describe('app icon assets', () => {
  const root = path.join(__dirname, '..', '..', '..')

  it('ships a committed master PNG in resources/', () => {
    const sourcePath = path.join(root, 'resources', 'icon-source.png')
    const legacyPath = path.join(root, 'resources', 'icon.png')
    const iconPath = fs.existsSync(sourcePath) ? sourcePath : legacyPath
    expect(fs.existsSync(iconPath)).toBe(true)
    const buf = fs.readFileSync(iconPath)
    expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true)
  })

  it('generate-icons normalizes raw art to legacy rx=20 @ 180px once', () => {
    const script = fs.readFileSync(path.join(root, 'scripts', 'generate-icons.js'), 'utf8')
    expect(script).toContain('icon-source-raw.png')
    expect(script).toContain('LEGACY_RX_AT_180 = 20')
    expect(script).toContain('normalizeSourceFromRaw')
  })
})
