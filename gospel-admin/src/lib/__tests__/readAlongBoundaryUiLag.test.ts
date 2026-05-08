import { READ_ALONG_BOUNDARY_UI_LAG_MS } from '@/lib/readAlongBoundaryUiLag'

describe('readAlongBoundaryUiLag', () => {
  it('exports a small positive delay', () => {
    expect(READ_ALONG_BOUNDARY_UI_LAG_MS).toBeGreaterThan(0)
    expect(READ_ALONG_BOUNDARY_UI_LAG_MS).toBeLessThanOrEqual(400)
  })
})
