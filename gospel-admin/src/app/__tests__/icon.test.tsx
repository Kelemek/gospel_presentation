// Test the OG icon generator

// Mock next/og ImageResponse so calling the default export doesn't throw
jest.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    child: any
    opts: any
    constructor(child: any, opts: any) {
      this.child = child
      this.opts = opts
    }
  }
}))

describe('OG Icon', () => {
  it('exports size and contentType and returns an ImageResponse', async () => {
    // Import after setting up the mock
    // eslint-disable-next-line global-require
    const iconMod = require('@/app/icon')

    expect(iconMod.size).toEqual({ width: 32, height: 32 })
    expect(iconMod.contentType).toBe('image/png')

    const result = iconMod.default()
    // The mocked ImageResponse stores opts passed in
    expect(result).toBeInstanceOf(require('next/og').ImageResponse)
    expect(result.opts).toMatchObject({ width: 32, height: 32 })
  })
})
