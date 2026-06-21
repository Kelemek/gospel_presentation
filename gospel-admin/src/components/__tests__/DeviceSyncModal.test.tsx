/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeviceSyncModal from '@/components/DeviceSyncModal'
import { AlertModalProvider } from '@/contexts/AlertModalContext'
import { GOSPEL_SYNC_ENABLED_KEY, GOSPEL_SYNC_KEY_KEY } from '@/lib/gospelDeviceSync/constants'
import { installTestBrowserStorage } from '@/lib/testing/testLocalStorage'

jest.mock('@/hooks/usePostHogModalOpen', () => ({
  usePostHogModalOpen: jest.fn(),
}))

jest.mock('@/lib/gospelDeviceSync/constants', () => ({
  ...jest.requireActual('@/lib/gospelDeviceSync/constants'),
  PAIRING_CODE_CLAIM_POLL_MS: 50,
}))

jest.mock('@/lib/gospelDeviceSync/client', () => ({
  preparePrimaryDevicePairing: jest.fn(),
  createPairingSession: jest.fn(),
  wrapAndUploadPairingEnvelope: jest.fn(),
  pushFullSnapshot: jest.fn(),
  finalizeDeviceSyncEnabled: jest.fn(),
  claimPairingCode: jest.fn(),
  completePairingFromClaim: jest.fn(),
  fetchPairingCodePending: jest.fn(),
}))

const client = jest.requireMock('@/lib/gospelDeviceSync/client') as {
  preparePrimaryDevicePairing: jest.Mock
  createPairingSession: jest.Mock
  wrapAndUploadPairingEnvelope: jest.Mock
  pushFullSnapshot: jest.Mock
  fetchPairingCodePending: jest.Mock
  claimPairingCode: jest.Mock
  completePairingFromClaim: jest.Mock
}

function renderModal(ui: React.ReactElement) {
  return render(<AlertModalProvider>{ui}</AlertModalProvider>)
}

describe('DeviceSyncModal', () => {
  beforeEach(() => {
    installTestBrowserStorage()
    jest.clearAllMocks()
    client.preparePrimaryDevicePairing.mockResolvedValue({
      syncKey: 'sync-key',
      storageId: 'a'.repeat(64),
    })
    client.fetchPairingCodePending.mockResolvedValue(true)
    client.claimPairingCode.mockResolvedValue({
      storageId: 'b'.repeat(64),
      syncKeyEnvelope: 'envelope',
    })
    client.completePairingFromClaim.mockResolvedValue(undefined)
  })

  it('shows Try again when create flow fails', async () => {
    client.createPairingSession.mockRejectedValue(new Error('Network error'))

    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} initialMode="create" />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    })
    expect(screen.queryByText('------')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('retries create flow after failure', async () => {
    client.createPairingSession
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ code: '123456', expiresAt: '2026-06-20T23:00:00.000Z' })
    client.wrapAndUploadPairingEnvelope.mockResolvedValue(undefined)
    client.pushFullSnapshot.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} initialMode="create" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/pairing code 1 2 3 4 5 6/i)).toBeInTheDocument()
    })
    expect(client.createPairingSession).toHaveBeenCalledTimes(2)
  })

  it('shows Create new code when the pairing code has expired', async () => {
    client.createPairingSession.mockResolvedValue({
      code: '654321',
      expiresAt: '2020-01-01T00:00:00.000Z',
    })
    client.wrapAndUploadPairingEnvelope.mockResolvedValue(undefined)
    client.pushFullSnapshot.mockResolvedValue(undefined)

    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} initialMode="create" />)

    await waitFor(() => {
      expect(screen.getByText('This code has expired.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /create new code/i })).toBeInTheDocument()
  })

  it('portals the dialog to document.body (Safari slide-out overflow)', () => {
    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} initialMode="both" />)
    const overlay = document.body.querySelector('[data-tour="device-sync-modal"]')
    expect(overlay).not.toBeNull()
    expect(overlay).toHaveClass('pt-[max(2.5rem,env(safe-area-inset-top,0))]')
  })

  it('shows manage actions when sync is already active', () => {
    window.localStorage.setItem(GOSPEL_SYNC_ENABLED_KEY, '1')
    window.localStorage.setItem(GOSPEL_SYNC_KEY_KEY, 'abc')

    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} />)

    expect(screen.getByRole('button', { name: /link another device/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove sync on this device/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create a code/i })).not.toBeInTheDocument()
  })

  it('opens link-another flow from manage view', async () => {
    window.localStorage.setItem(GOSPEL_SYNC_ENABLED_KEY, '1')
    window.localStorage.setItem(GOSPEL_SYNC_KEY_KEY, 'abc')
    client.createPairingSession.mockResolvedValue({
      code: '111222',
      expiresAt: '2026-06-20T23:00:00.000Z',
    })
    client.wrapAndUploadPairingEnvelope.mockResolvedValue(undefined)
    client.pushFullSnapshot.mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /link another device/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/pairing code 1 1 1 2 2 2/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('shows linked success when the pairing code is claimed on another device', async () => {
    const future = new Date(Date.now() + 90_000).toISOString()
    client.createPairingSession.mockResolvedValue({
      code: '290330',
      expiresAt: future,
    })
    client.wrapAndUploadPairingEnvelope.mockResolvedValue(undefined)
    client.pushFullSnapshot.mockResolvedValue(undefined)
    client.fetchPairingCodePending.mockResolvedValueOnce(true).mockResolvedValue(false)

    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} initialMode="create" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/pairing code 2 9 0 3 3 0/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(/your other device is linked/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.queryByText(/expires in/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  it('claims pairing code when user enters six digits and submits', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    renderModal(<DeviceSyncModal isOpen onClose={onClose} initialMode="enter" />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    await user.type(input, '482910')

    await waitFor(() => {
      expect(client.claimPairingCode).toHaveBeenCalledWith('482910')
    })
    expect(client.completePairingFromClaim).toHaveBeenCalledWith('482910', {
      storageId: 'b'.repeat(64),
      syncKeyEnvelope: 'envelope',
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('sanitizes pasted pairing codes with spaces before claiming', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    renderModal(<DeviceSyncModal isOpen onClose={onClose} initialMode="enter" />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    await user.click(input)
    await user.paste('12 34 56')

    await waitFor(() => {
      expect(client.claimPairingCode).toHaveBeenCalledWith('123456')
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('claims when a full code is pasted', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    renderModal(<DeviceSyncModal isOpen onClose={onClose} initialMode="enter" />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    await user.click(input)
    await user.paste('998877')

    await waitFor(() => {
      expect(client.claimPairingCode).toHaveBeenCalledWith('998877')
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('claims when iOS autofill inserts a full code via input', async () => {
    const onClose = jest.fn()
    renderModal(<DeviceSyncModal isOpen onClose={onClose} initialMode="enter" />)

    const input = screen.getByLabelText(/6-digit pairing code/i)
    fireEvent.input(input, { target: { value: '998877' } })

    await waitFor(() => {
      expect(client.claimPairingCode).toHaveBeenCalledWith('998877')
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('uses scrollable body on the enter-code tab', () => {
    renderModal(<DeviceSyncModal isOpen onClose={jest.fn()} initialMode="enter" />)
    const panel = document.body.querySelector('[data-tour="device-sync-modal"] .gospel-modal-safe-panel')
    expect(panel?.querySelector('.gospel-modal-safe-scroll')).not.toBeNull()
  })
})
