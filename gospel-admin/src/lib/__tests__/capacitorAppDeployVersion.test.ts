import {
  isCapacitorDeployVersionStale,
  isLikelyStaleChunkLoadError,
  messageFromUnknownError,
  reloadCapacitorWebViewForDeploy,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'
import { reloadCapacitorWebViewInApp } from '@/lib/capacitorClientReload'

jest.mock('@/lib/capacitorClientReload', () => {
  const actual = jest.requireActual<typeof import('@/lib/capacitorClientReload')>(
    '@/lib/capacitorClientReload'
  )
  return {
    ...actual,
    reloadCapacitorWebViewInApp: jest.fn(actual.reloadCapacitorWebViewInApp),
  }
})

const mockedInAppReload = jest.mocked(reloadCapacitorWebViewInApp)

describe('capacitorAppDeployVersion', () => {
  beforeEach(() => {
    mockedInAppReload.mockImplementation(
      jest.requireActual<typeof import('@/lib/capacitorClientReload')>(
        '@/lib/capacitorClientReload'
      ).reloadCapacitorWebViewInApp
    )
  })

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

  describe('reloadCapacitorWebViewForDeploy', () => {
    it('stores the deploy version and prefers in-app reload when available', () => {
      mockedInAppReload.mockReturnValue(true)
      reloadCapacitorWebViewForDeploy('deploy-new')
      expect(sessionStorage.getItem('gospel-capacitor-deploy-version')).toBe('deploy-new')
      expect(mockedInAppReload).toHaveBeenCalledWith('deploy-new')
    })
  })

  describe('setStoredCapacitorDeployVersion', () => {
    it('ignores sessionStorage errors', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })

      expect(() => setStoredCapacitorDeployVersion('deploy-new')).not.toThrow()
    })
  })
})
