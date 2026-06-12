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
  resetWebViewSessionDeployBaseline,
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
    resetWebViewSessionDeployBaseline()
    mockShowAlert.mockClear()
    setCapacitorNativePlatform(false)
  })

  describe('on web', () => {
    it('does not store deploy version or prompt while welcome is not dismissed', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first', changelog: ['First release note.'] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBeNull()
      expect(mockShowAlert).not.toHaveBeenCalled()
    })

    it('shows whats-new after welcome is dismissed following an initial blocked check', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first', changelog: ['First release note.'] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(mockShowAlert).not.toHaveBeenCalled()

      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['First release note.'])
        )
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe('deploy-first')
    })

    it('shows missed whats-new notes on a new browser session after welcome was dismissed', async () => {
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
    })

    it('shows additional whats-new notes when a deploy changes mid-session after an earlier notice', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-1', changelog: ['First note.'] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['First note.'])
        )
      })

      mockShowAlert.mockClear()
      setStoredCapacitorDeployVersion('deploy-1')
      setSeenChangelogCount(1)
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-2',
          changelog: ['First note.', 'Second note.'],
        }),
      })) as unknown as typeof fetch

      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['Second note.'])
        )
      })
    })

    it('shows whats-new after welcome is dismissed when deploy changed mid-session before dismiss', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          changelog: ['Release note from mid-session deploy.'],
        }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(mockShowAlert).not.toHaveBeenCalled()
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe('deploy-old')

      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['Release note from mid-session deploy.'])
        )
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe('deploy-new')
    })

    it('shows whats-new instead of a restart prompt when a deploy changes mid-session', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      setStoredCapacitorDeployVersion('deploy-old')
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
      expect(mockShowAlert).not.toHaveBeenCalledWith(
        buildCapacitorRestartAppNotice(['Older release note.', 'Latest release note.'])
      )
    })

    it('does not prompt on stale chunk errors', async () => {
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
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(mockShowAlert).not.toHaveBeenCalled()
    })
  })

  describe('on Capacitor native', () => {
    beforeEach(() => {
      setCapacitorNativePlatform(true)
    })

    afterEach(() => {
      setCapacitorNativePlatform(false)
    })

    it('does not store deploy version or prompt while welcome is not dismissed', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first', changelog: ['First release note.'] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBeNull()
      expect(mockShowAlert).not.toHaveBeenCalled()
    })

    it('shows whats-new after welcome is dismissed following an initial blocked check', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ version: 'deploy-first', changelog: ['First release note.'] }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
      expect(mockShowAlert).not.toHaveBeenCalled()

      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      window.dispatchEvent(new Event('focus'))

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorWhatsNewNotice(['First release note.'])
        )
      })
      expect(sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)).toBe('deploy-first')
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

    it('prompts to restart when remounted mid-session after sessionStorage is cleared', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          changelog: ['Older release note.', 'Latest release note.'],
        }),
      })) as unknown as typeof fetch

      const { unmount } = render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorRestartAppNotice(['Older release note.', 'Latest release note.'])
        )
      })

      mockShowAlert.mockClear()
      sessionStorage.clear()

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorRestartAppNotice(['Older release note.', 'Latest release note.'])
        )
      })
      expect(mockShowAlert).not.toHaveBeenCalledWith(
        buildCapacitorWhatsNewNotice(['Older release note.', 'Latest release note.'])
      )
    })

    it('does not mark changelog as seen when prompting to restart', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          changelog: ['Older release note.', 'Latest release note.'],
        }),
      })) as unknown as typeof fetch

      const { unmount } = render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorRestartAppNotice(['Older release note.', 'Latest release note.'])
        )
      })
      expect(localStorage.getItem(CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY)).toBeNull()
      expect(localStorage.getItem(CAPACITOR_DEPLOY_ACK_VERSION_KEY)).toBeNull()

      unmount()
      mockShowAlert.mockClear()
      sessionStorage.clear()
      resetWebViewSessionDeployBaseline()

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

    it('includes only unseen changelog entries in the restart alert', async () => {
      localStorage.setItem(PRESENTATION_FIRST_VISIT_WELCOME_KEY, '1')
      setSeenChangelogCount(1)
      setStoredCapacitorDeployVersion('deploy-old')
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
          buildCapacitorRestartAppNotice(['Latest release note.'])
        )
      })
    })

    it('includes unseen deploy changelog entries in the restart alert', async () => {
      setStoredCapacitorDeployVersion('deploy-old')
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          version: 'deploy-new',
          changelog: ['Daily verse challenge: clearer feedback when you finish a day.'],
        }),
      })) as unknown as typeof fetch

      render(<CapacitorDeployNoticeController />)

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith(
          buildCapacitorRestartAppNotice([
            'Daily verse challenge: clearer feedback when you finish a day.',
          ])
        )
      })
    })
  })
})
