/**
 * @jest-environment jsdom
 */

import { act, render, waitFor } from '@testing-library/react'
import { GospelDeviceSyncEngine } from '../GospelDeviceSyncEngine'
import {
  GOSPEL_SYNC_FLUSH_REQUEST_EVENT,
  GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT,
  SYNC_PUSH_DEBOUNCE_MS,
} from '@/lib/gospelDeviceSync/constants'

const mockIsDeviceSyncActive = jest.fn(() => false)
const mockGetDirtyKeys = jest.fn(() => [] as string[])
const mockReadSyncKeyBase64 = jest.fn(() => null as string | null)
const mockPushDirtyKeys = jest.fn(async () => {})
const mockPullChangedKeys = jest.fn(async () => false)
const mockDeriveStorageId = jest.fn(async () => 'storage-id')

jest.mock('@/lib/gospelDeviceSync/dirty', () => ({
  isDeviceSyncActive: () => mockIsDeviceSyncActive(),
  getDirtyKeys: () => mockGetDirtyKeys(),
  emitDeviceSyncStateChanged: jest.fn(),
  readSyncKeyBase64: () => mockReadSyncKeyBase64(),
}))

jest.mock('@/lib/gospelDeviceSync/client', () => ({
  pushDirtyKeys: (...args: unknown[]) => mockPushDirtyKeys(...args),
  pullChangedKeys: (...args: unknown[]) => mockPullChangedKeys(...args),
}))

jest.mock('@/lib/gospelDeviceSync/crypto', () => ({
  deriveStorageId: (...args: unknown[]) => mockDeriveStorageId(...args),
}))

describe('GospelDeviceSyncEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockIsDeviceSyncActive.mockReturnValue(false)
    mockGetDirtyKeys.mockReturnValue([])
    mockReadSyncKeyBase64.mockReturnValue(null)
    mockPushDirtyKeys.mockClear()
    mockPullChangedKeys.mockClear()
    mockDeriveStorageId.mockClear()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('removes lifecycle listeners on unmount', () => {
    const visibilityAdd = jest.spyOn(document, 'addEventListener')
    const visibilityRemove = jest.spyOn(document, 'removeEventListener')
    const windowAdd = jest.spyOn(window, 'addEventListener')
    const windowRemove = jest.spyOn(window, 'removeEventListener')

    const { unmount } = render(<GospelDeviceSyncEngine />)

    const visibilityHandler = visibilityAdd.mock.calls.find((call) => call[0] === 'visibilitychange')?.[1]
    const pageHideHandler = windowAdd.mock.calls.find((call) => call[0] === 'pagehide')?.[1]
    expect(visibilityHandler).toEqual(expect.any(Function))
    expect(pageHideHandler).toEqual(expect.any(Function))

    unmount()

    expect(visibilityRemove).toHaveBeenCalledWith('visibilitychange', visibilityHandler)
    expect(windowRemove).toHaveBeenCalledWith('pagehide', pageHideHandler)
  })

  it('pushes pending dirty keys after startup pull completes', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockGetDirtyKeys.mockReturnValue(['gospel-profile-theme'])
    mockReadSyncKeyBase64.mockReturnValue('sync-key')
    let pullResolved!: () => void
    const pullGate = new Promise<boolean>((resolve) => {
      pullResolved = () => resolve(false)
    })
    mockPullChangedKeys.mockReturnValue(pullGate)

    render(<GospelDeviceSyncEngine />)

    expect(mockPushDirtyKeys).not.toHaveBeenCalled()

    pullResolved()
    await waitFor(() => {
      expect(mockPullChangedKeys).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockPushDirtyKeys).toHaveBeenCalledWith('sync-key', 'storage-id')
    })
  })

  it('emits startup pull done after first pull attempt', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockReadSyncKeyBase64.mockReturnValue('sync-key')
    const handler = jest.fn()
    window.addEventListener(GOSPEL_SYNC_STARTUP_PULL_DONE_EVENT, handler)

    render(<GospelDeviceSyncEngine />)

    await waitFor(() => {
      expect(handler).toHaveBeenCalled()
    })
  })

  it('flushes push on window blur', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockReadSyncKeyBase64.mockReturnValue('sync-key')

    render(<GospelDeviceSyncEngine />)
    mockPushDirtyKeys.mockClear()

    act(() => {
      window.dispatchEvent(new Event('blur'))
    })

    await act(async () => {
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockPushDirtyKeys).toHaveBeenCalledWith('sync-key', 'storage-id')
    })
  })

  it('debounces push after gospel-sync-dirty', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockReadSyncKeyBase64.mockReturnValue('sync-key')

    render(<GospelDeviceSyncEngine />)
    mockPushDirtyKeys.mockClear()

    act(() => {
      window.dispatchEvent(new CustomEvent('gospel-sync-dirty'))
    })

    expect(mockPushDirtyKeys).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(SYNC_PUSH_DEBOUNCE_MS - 1)
    })
    expect(mockPushDirtyKeys).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(1)
    })

    await waitFor(() => {
      expect(mockPushDirtyKeys).toHaveBeenCalledWith('sync-key', 'storage-id')
    })
  })

  it('flushes push when the tab becomes hidden', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockReadSyncKeyBase64.mockReturnValue('sync-key')

    render(<GospelDeviceSyncEngine />)
    mockPushDirtyKeys.mockClear()

    const hidden = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await act(async () => {
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockPushDirtyKeys).toHaveBeenCalledWith('sync-key', 'storage-id')
    })

    if (hidden) {
      Object.defineProperty(document, 'visibilityState', hidden)
    } else {
      delete (document as { visibilityState?: string }).visibilityState
    }
  })

  it('flushes push on pagehide', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockReadSyncKeyBase64.mockReturnValue('sync-key')

    render(<GospelDeviceSyncEngine />)
    mockPushDirtyKeys.mockClear()

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    await act(async () => {
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(mockPushDirtyKeys).toHaveBeenCalledWith('sync-key', 'storage-id')
    })
  })

  it('flushes push on gospel-sync-flush-request', async () => {
    mockIsDeviceSyncActive.mockReturnValue(true)
    mockReadSyncKeyBase64.mockReturnValue('sync-key')

    render(<GospelDeviceSyncEngine />)
    mockPushDirtyKeys.mockClear()

    act(() => {
      window.dispatchEvent(new CustomEvent(GOSPEL_SYNC_FLUSH_REQUEST_EVENT))
    })

    await waitFor(() => {
      expect(mockPushDirtyKeys).toHaveBeenCalledWith('sync-key', 'storage-id')
    })
  })
})
