import {
  getSeenChangelogCount,
  getUnseenChangelogMessages,
  isCapacitorDeployVersionStale,
  isLikelyStaleChunkLoadError,
  messageFromUnknownError,
  setSeenChangelogCount,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'

describe('capacitorAppDeployVersion', () => {
  describe('isCapacitorDeployVersionStale', () => {
    it('is false when either version is missing', () => {
      expect(isCapacitorDeployVersionStale(null, 'abc')).toBe(false)
      expect(isCapacitorDeployVersionStale('abc', null)).toBe(false)
    })

    it('is true when stored and remote differ', () => {
      expect(isCapacitorDeployVersionStale('deploy-a', 'deploy-b')).toBe(true)
    })

    it('is false when versions match', () => {
      expect(isCapacitorDeployVersionStale('deploy-a', 'deploy-a')).toBe(false)
    })
  })

  describe('isLikelyStaleChunkLoadError', () => {
    it('detects common chunk load failures', () => {
      expect(isLikelyStaleChunkLoadError('Loading chunk 123 failed.')).toBe(true)
      expect(
        isLikelyStaleChunkLoadError('Failed to fetch dynamically imported module')
      ).toBe(true)
      expect(isLikelyStaleChunkLoadError('Importing a module script failed.')).toBe(true)
      expect(isLikelyStaleChunkLoadError('Failed to load script: /_next/static/chunks/1.js')).toBe(
        true
      )
      expect(isLikelyStaleChunkLoadError('Hydration failed because the server HTML was replaced.')).toBe(
        true
      )
    })

    it('ignores unrelated errors', () => {
      expect(isLikelyStaleChunkLoadError('Network request failed')).toBe(false)
    })
  })

  describe('messageFromUnknownError', () => {
    it('reads string and Error reasons', () => {
      expect(messageFromUnknownError('chunk failed')).toBe('chunk failed')
      expect(messageFromUnknownError(new Error('chunk failed'))).toBe('chunk failed')
      expect(messageFromUnknownError({})).toBe('')
    })
  })

  describe('setStoredCapacitorDeployVersion', () => {
    it('ignores sessionStorage errors', () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })

      expect(() => setStoredCapacitorDeployVersion('deploy-new')).not.toThrow()
      setItemSpy.mockRestore()
    })
  })

  describe('changelog seen count', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('getUnseenChangelogMessages returns entries after the seen count', () => {
      expect(getUnseenChangelogMessages(['one', 'two', 'three'], 0)).toEqual([
        'one',
        'two',
        'three',
      ])
      expect(getUnseenChangelogMessages(['one', 'two', 'three'], 2)).toEqual(['three'])
      expect(getUnseenChangelogMessages(['one', 'two', 'three'], 5)).toEqual([])
    })

    it('setSeenChangelogCount persists a non-negative integer', () => {
      setSeenChangelogCount(2)
      expect(getSeenChangelogCount()).toBe(2)
    })
  })
})
