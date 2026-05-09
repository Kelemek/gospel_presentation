import {
  addPresentationReadCompleteSlug,
  GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT,
  isPresentationReadComplete,
  loadPresentationReadCompleteSlugs,
  PRESENTATION_READ_COMPLETE_STORAGE_KEY,
  removePresentationReadCompleteSlug,
} from '@/lib/presentationReadCompleteStorage'

function memoryStorage(): Storage {
  const data: Record<string, string> = {}
  return {
    get length() {
      return Object.keys(data).length
    },
    clear() {
      Object.keys(data).forEach((k) => {
        delete data[k]
      })
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null
    },
    key(index: number) {
      return Object.keys(data)[index] ?? null
    },
    removeItem(key: string) {
      delete data[key]
    },
    setItem(key: string, value: string) {
      data[key] = value
    },
  } as Storage
}

describe('presentationReadCompleteStorage', () => {
  const origLocalStorage = globalThis.localStorage

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: memoryStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: origLocalStorage,
      configurable: true,
    })
  })

  it('loadPresentationReadCompleteSlugs returns empty when missing', () => {
    expect(loadPresentationReadCompleteSlugs()).toEqual([])
  })

  it('addPresentationReadCompleteSlug dedupes and trims', () => {
    addPresentationReadCompleteSlug('  a  ')
    addPresentationReadCompleteSlug('a')
    expect(loadPresentationReadCompleteSlugs()).toEqual(['a'])
  })

  it('removePresentationReadCompleteSlug removes slug', () => {
    addPresentationReadCompleteSlug('x')
    addPresentationReadCompleteSlug('y')
    removePresentationReadCompleteSlug('x')
    expect(loadPresentationReadCompleteSlugs()).toEqual(['y'])
  })

  it('isPresentationReadComplete reflects storage', () => {
    expect(isPresentationReadComplete('z')).toBe(false)
    addPresentationReadCompleteSlug('z')
    expect(isPresentationReadComplete('z')).toBe(true)
  })

  it('invalid JSON yields empty load', () => {
    localStorage.setItem(PRESENTATION_READ_COMPLETE_STORAGE_KEY, 'not-json')
    expect(loadPresentationReadCompleteSlugs()).toEqual([])
  })

  it('wrong schema yields empty load', () => {
    localStorage.setItem(PRESENTATION_READ_COMPLETE_STORAGE_KEY, JSON.stringify({ v: 0, slugs: ['a'] }))
    expect(loadPresentationReadCompleteSlugs()).toEqual([])
  })

  it('dispatches custom event on add and remove', () => {
    const adds: boolean[] = []
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ slug: string; read: boolean }>
      adds.push(ce.detail.read)
    }
    window.addEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, handler)
    addPresentationReadCompleteSlug('p')
    removePresentationReadCompleteSlug('p')
    window.removeEventListener(GOSPEL_PRESENTATION_READ_STATUS_CHANGED_EVENT, handler)
    expect(adds).toEqual([true, false])
  })
})
