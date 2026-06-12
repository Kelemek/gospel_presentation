/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { CapacitorDeployNoticeController } from '../CapacitorDeployNoticeController'
import {
  CAPACITOR_DEPLOY_ACK_VERSION_KEY,
  CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY,
  CAPACITOR_DEPLOY_VERSION_STORAGE_KEY,
  setSeenChangelogCount,
  setStoredCapacitorDeployVersion,
} from '@/lib/capacitorAppDeployVersion'
import {
  buildCapacitorRestartAppNotice,
  buildCapacitorWhatsNewNotice,
  CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY,
  CAPACITOR_RESTART_APP_NOTICE,
} from '@/lib/capacitorDeployNotice'
import { PRESENTATION_FIRST_VISIT_WELCOME_KEY } from '@/lib/presentationWelcomeStorage'

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
    localStorage.clear()
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

    it('stores the first seen deploy version without prompting when welcome is not dismissed', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first', changelog: ['First release note.'] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe(
          'deploy-first'
        )
      })
      expect(mockShowAlert).not.toHaveBeenCalled()
    })

    it('shows missed whats-new notes on cold start after welcome was dismissed', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          changelog: ['Older release note.', 'Latest release note.'],
        }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['Older release note.', 'Latest release note.'])
        )
      })
      expect(localStorage.getItem(CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY)).toBe('2')
      expect(localStorage.getItem(CAPACITOR_DEPLOY_ACK_VERSION_KEY)).toBe('deploy-new')
    })

    it('shows only unseen whats-new notes on cold start', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      setSeenChangelogCount(1)
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          changelog: ['Older release note.', 'Latest release note.'],
        }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['Latest release note.'])
        )
      })
    })

    it('prompts to restart when a deploy change is detected', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new', changelog: [] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(CAPACITOR_RESTART_APP_NOTICE)
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY)).toBe(
        'deploy-new'
      )
    })

    it('does not mark changelog as seen when prompting to restart', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          message: 'Latest release note.',
          changelog: ['Older release note.', 'Latest release note.'],
        }),
      })) as unknown as typeof fetch

      const { unmount } = render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorRestartAppNotice('Latest release note.')
        )
      })
      expect(localStorage.getItem(CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY)).toBeNull()
      expect(localStorage.getItem(CAPACITOR_DEPLOY_ACK_VERSION_KEY)).toBeNull()

      unmount()
      mockShowAlert.mockClear()
      sessionStorage.clear()

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['Older release note.', 'Latest release note.'])
        )
      })
    })

    it('does not prompt again for the same remote deploy version', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      sessionStorage.setItem(CAPACITOR_DEPLOY_NOTICE_SHOWN_FOR_KEY, 'deploy-new')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-new', changelog: [] }),
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
        json: async () => ({ version: 'deploy-new', changelog: [] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      window.dispatchEvent(
        new ErrorEvent('error', { message: 'Loading chunk 12 failed.' })
      )

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(CAPACITOR_RESTART_APP_NOTICE)
      })
    })

    it('includes optional deploy changelog in the alert', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          message: 'Daily verse challenge: clearer feedback when you finish a day.',
          changelog: ['Daily verse challenge: clearer feedback when you finish a day.'],
        }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorRestartAppNotice(
            'Daily verse challenge: clearer feedback when you finish a day.'
          )
        )
      })
    })
  })
})
