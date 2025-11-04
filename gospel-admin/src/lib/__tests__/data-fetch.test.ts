import { jest } from '@jest/globals'

describe('data.getGospelPresentationData', () => {
  beforeEach(() => {
    jest.resetModules()
    // Ensure global.fetch can be mocked
    ;(global as any).fetch = undefined
  })

  afterEach(() => {
    delete (global as any).fetch
  })

  test('returns sections when fetch succeeds', async () => {
    const sections = [{ section: 'x', title: 'T', subsections: [] }]
    ;(global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ content: { sections } })
    }))

    const mod = await import('../data')
    const res = await mod.getGospelPresentationData()
    expect(res).toEqual(sections)
  })

  test('returns fallback when response not ok', async () => {
    ;(global as any).fetch = jest.fn(async () => ({ ok: false }))
    const mod = await import('../data')
    const res = await mod.getGospelPresentationData()
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBeGreaterThan(0)
    // fallback top-level section id is "1"
    expect((res[0] as any).section).toBe('1')
  })

  test('returns fallback when fetch throws', async () => {
    ;(global as any).fetch = jest.fn(async () => { throw new Error('network') })
    const mod = await import('../data')
    const res = await mod.getGospelPresentationData()
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBeGreaterThan(0)
  })

  test('gospelPresentationData is exported as empty array', async () => {
    const mod = await import('../data')
    expect(Array.isArray(mod.gospelPresentationData)).toBe(true)
    expect(mod.gospelPresentationData.length).toBe(0)
  })
})
