import {
  loadPublicResourcesMenuItems,
  prefetchPublicResourcesMenu,
  PUBLIC_RESOURCES_MENU_CACHE_KEY,
  readPublicResourcesMenuCache,
  resetPublicResourcesMenuClientForTests,
  writePublicResourcesMenuCache,
} from '@/lib/publicResourcesMenuClient'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import { installTestSessionStorage } from '@/lib/testing/testLocalStorage'

const sampleItems: PublicResourceItem[] = [
  { type: 'template', slug: 'default', title: 'The Gospel Presentation' },
]

describe('publicResourcesMenuClient', () => {
  beforeEach(() => {
    installTestSessionStorage()
    sessionStorage.clear()
    resetPublicResourcesMenuClientForTests()
    jest.restoreAllMocks()
  })

  it('reads and writes session cache', () => {
    expect(readPublicResourcesMenuCache()).toBeNull()
    writePublicResourcesMenuCache(sampleItems)
    expect(readPublicResourcesMenuCache()).toEqual(sampleItems)
    expect(sessionStorage.getItem(PUBLIC_RESOURCES_MENU_CACHE_KEY)).toContain('default')
  })

  it('ignores invalid cache payloads', () => {
    sessionStorage.setItem(PUBLIC_RESOURCES_MENU_CACHE_KEY, '{"v":2}')
    expect(readPublicResourcesMenuCache()).toBeNull()
  })

  it('fetches from network, caches, and dedupes concurrent loads', async () => {
    const fetchMock = jest.fn(async (): Promise<Response> => {
      return {
        ok: true,
        json: async () => ({ items: sampleItems }),
      } as Response
    })
    global.fetch = fetchMock as typeof fetch

    const [a, b] = await Promise.all([
      loadPublicResourcesMenuItems(),
      loadPublicResourcesMenuItems(),
    ])

    expect(a).toEqual(sampleItems)
    expect(b).toEqual(sampleItems)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(readPublicResourcesMenuCache()).toEqual(sampleItems)
  })

  it('prefetch triggers the same deduped fetch', async () => {
    const fetchMock = jest.fn(async (): Promise<Response> => {
      return {
        ok: true,
        json: async () => ({ items: sampleItems }),
      } as Response
    })
    global.fetch = fetchMock as typeof fetch

    prefetchPublicResourcesMenu()
    const items = await loadPublicResourcesMenuItems()

    expect(items).toEqual(sampleItems)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns empty array when network fails', async () => {
    global.fetch = jest.fn(async (): Promise<Response> => {
      return { ok: false } as Response
    }) as typeof fetch

    const items = await loadPublicResourcesMenuItems()
    expect(items).toEqual([])
    expect(readPublicResourcesMenuCache()).toEqual([])
  })
})
