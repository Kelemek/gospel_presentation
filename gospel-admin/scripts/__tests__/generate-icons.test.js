/** @jest-environment node */

const fs = require('fs')
const path = require('path')

const cornerRadiusFor = (size) => Math.max(2, Math.round((size * 20) / 180))

describe('generate-icons script', () => {
  const scriptPath = path.join(__dirname, '..', 'generate-icons.js')

  it('exists and documents public/favicon.png (avoids /icon slug conflict)', () => {
    const script = fs.readFileSync(scriptPath, 'utf8')
    expect(script).toContain('public/favicon.png')
    expect(script).toContain('resources/icon-source.png')
    expect(script).toContain('icon-source-raw.png')
    expect(script).toContain('/icon conflicts')
  })

  it('normalizes raw art to legacy apple-touch corner radius (rx=20 @ 180px)', () => {
    const script = fs.readFileSync(scriptPath, 'utf8')
    expect(script).toContain('normalizeSourceFromRaw')
    expect(script).toContain('LEGACY_RX_AT_180 = 20')
    expect(cornerRadiusFor(180)).toBe(20)
    expect(cornerRadiusFor(1024)).toBe(114)
  })

  it('generates favicon from normalized master with transparent corners', () => {
    const script = fs.readFileSync(scriptPath, 'utf8')
    expect(script).toContain('resizeSquareTransparent(32, src')
    expect(script).toContain('transparent corners')
  })
})
