/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { CapacitorDeployNoticeController } from '../CapacitorDeployNoticeController'
import {
  CAPACITOR_DEPLOY_VERSION_STORAGE_KEY,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'
import {
  CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY,
  CAPACITOR_RESTART_APP_NOTICE,
} from '@/lib/capacitorDeployNotice'

const mockShowAlert = jest.fn()

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

jest.mock('@/contexts/AlertModalContext', () => ({
  useAlertModal: () => ({ showAlert: mockShowAlert }),
}))

function setCapacitorNativePlatform(isNative: boolean) {
  const Capacitor = require('@capacitor/core').Capacitor
  Capacitor.isNativePlatform = () => isNative
}

describe('CapacitorDeployNoticeController', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    sessionStorage.clear()
    mockShowAlert.mockClear()
    setCapacitorNativePlatform(false)
  })

  it('does nothing on web', async () => {
    global.fetch = jest.fn()
    const { container } = render(<CapacitorDeployNoticeController />)
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled()
    })
    expect(container.firstChild).toBeNull()
    expect(mockShowAlert).not.toHaveBeenCalled()
  })

  describe('on Capacitor native', () => {
    beforeEach(() => {
      setCapacitorNativePlatform(true)
    })

    afterEach(() => {
      setCapacitorNativePlatform(false)
    })

    it('stores the first seen deploy version without prompting', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe(
          'deploy-first'
        )
      })
      expect(mockShowAlert).not.toHaveBeenCalled()
    })

    it('prompts to restart when a deploy change is detected', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(CAPACITOR_RESTART_APP_NOTICE)
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY)).toBe(
        'deploy-new'
      )
    })

    it('does not prompt again for the same remote deploy version', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      sessionStorage.setItem(CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY, 'deploy-new')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(mockShowAlert).not.toHaveBeenCalled()
    })

    it('prompts on stale chunk errors', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new' }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      window.dispatchEvent(
        new ErrorEvent('error', { message: 'Loading chunk 12 failed.' })
      )

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(CAPACITOR_RESTART_APP_NOTICE)
      })
    })
  })
})
