/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { CapacitorDeployReloadController } from '../CapacitorDeployReloadController'
import {
  CAPACITOR_DEPLOY_VERSION_STORAGE_KEY,
  reloadCapacitorWebViewForDeploy,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

jest.mock('@/lib/capacitorAppDeployVersion', () => {
  const actual = jest.requireActual<typeof import('@/lib/capacitorAppDeployVersion')>(
    '@/lib/capacitorAppDeployVersion'
  )
  return {
    ...actual,
    reloadCapacitorWebViewForDeploy: jest.fn(),
  }
})

const mockedReload = jest.mocked(reloadCapacitorWebViewForDeploy)

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

function setCapacitorNativePlatform(isNative: boolean) {
  const Capacitor = require('@capacitor/core').Capacitor
  Capacitor.isNativePlatform = () => isNative
}

describe('CapacitorDeployReloadController', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    sessionStorage.clear()
    mockedReload.mockClear()
    setVisibilityState('visible')
    setCapacitorNativePlatform(false)
  })

  it('does nothing on web', async () => {
    global.fetch = jest.fn()
    const { container } = render(<CapacitorDeployReloadController />)
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
    expect(container.firstChild).toBeNull()
  })

  describe('on Capacitor native', () => {
    beforeEach(() => {
      setCapacitorNativePlatform(true)
    })

    afterEach(() => {
      setCapacitorNativePlatform(false)
    })

    it('stores the first seen deploy version without reloading', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployReloadController />)

      await waitFor(() => {
        expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe(
          'deploy-first'
        )
      })
      expect(mockedReload).not.toHaveBeenCalled()
    })

    it('waits for foreground return before reloading after a deploy change', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployReloadController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(mockedReload).not.toHaveBeenCalled()

      setVisibilityState('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
      setVisibilityState('visible')
      document.dispatchEvent(new Event('visibilitychange'))

      await waitFor(() => {
        expect(mockedReload).toHaveBeenCalledWith('deploy-new')
      })
    })

    it('retries foreground reload when verify fetch fails, then reloads on success', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => {
        const call = (global.fetch as jest.Mock).mock.calls.length
        if (call === 3) {
          return { ok: false }
        }
        return {
          ok: true,
          json: async () => ({ version: 'deploy-new' }),
        }
      }) as unknown as typeof fetch

      render(<CapacitorDeployReloadController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      const foreground = () => {
        setVisibilityState('hidden')
        document.dispatchEvent(new Event('visibilitychange'))
        setVisibilityState('visible')
        document.dispatchEvent(new Event('visibilitychange'))
      }

      foreground()
      await waitFor(() => {
        expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(3)
      })
      expect(mockedReload).not.toHaveBeenCalled()

      foreground()
      await waitFor(() => {
        expect(mockedReload).toHaveBeenCalledWith('deploy-new')
      })
    })

    it('detects deploy changes when sessionStorage is unavailable', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('sessionStorage disabled')
      })
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('sessionStorage disabled')
      })

      global.fetch = jest.fn(async () => {
        const call = (global.fetch as jest.Mock).mock.calls.length
        if (call === 1) {
          return { ok: true, json: async () => ({ version: 'deploy-old' }) }
        }
        return { ok: true, json: async () => ({ version: 'deploy-new' }) }
      }) as unknown as typeof fetch

      render(<CapacitorDeployReloadController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
      expect(mockedReload).not.toHaveBeenCalled()

      setVisibilityState('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
      setVisibilityState('visible')
      document.dispatchEvent(new Event('visibilitychange'))

      await waitFor(() => {
        expect(mockedReload).toHaveBeenCalledWith('deploy-new')
      })
    })

    it('reloads immediately on stale chunk errors', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployReloadController />)

      window.dispatchEvent(
        new ErrorEvent('error', { message: 'Loading chunk 12 failed.' })
      )

      await waitFor(() => {
        expect(mockedReload).toHaveBeenCalledWith('deploy-new')
      })
    })
  })
})
