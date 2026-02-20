import React from 'react'
import { render, act } from '@testing-library/react'
import { useSessionMonitor } from '../useSessionMonitor'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockCreateClient = require('@/lib/supabase/client').createClient as jest.Mock

function TestComponent({ options }: { options?: { enabled?: boolean; checkInterval?: number; onSessionExpired?: () => void } }) {
  const { checkSession } = useSessionMonitor(options)
  return <button type="button" onClick={() => checkSession()}>Check</button>
}

describe('useSessionMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockCreateClient.mockClear()
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } }, error: null }),
        refreshSession: jest.fn(),
        signOut: jest.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calls getSession on mount when enabled', async () => {
    render(<TestComponent />)
    await act(async () => { jest.runAllTimersAsync() })
    expect(mockCreateClient).toHaveBeenCalled()
    const client = mockCreateClient()
    expect(client.auth.getSession).toHaveBeenCalled()
  })

  it('does not run interval when enabled is false', async () => {
    const push = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push })
    render(<TestComponent options={{ enabled: false }} />)
    await act(async () => { jest.advanceTimersByTime(70000) })
    expect(push).not.toHaveBeenCalled()
  })

  it('calls onSessionExpired when no session', async () => {
    const onSessionExpired = jest.fn()
    mockCreateClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    })
    const { getByRole } = render(<TestComponent options={{ onSessionExpired }} />)
    await act(async () => { getByRole('button').click() })
    expect(onSessionExpired).toHaveBeenCalled()
  })

  it('redirects to login when no session and no callback', async () => {
    const push = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push })
    mockCreateClient.mockReturnValue({
      auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    })
    const { getByRole } = render(<TestComponent />)
    await act(async () => { getByRole('button').click() })
    expect(push).toHaveBeenCalledWith('/login')
  })

  it('refreshes session when expired and redirects when refresh fails', async () => {
    const push = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push })
    const signOut = jest.fn().mockResolvedValue(undefined)
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { expires_at: Math.floor(Date.now() / 1000) - 60 } },
          error: null,
        }),
        refreshSession: jest.fn().mockResolvedValue({ data: { session: null }, error: new Error('refresh failed') }),
        signOut,
      },
    })
    const { getByRole } = render(<TestComponent />)
    await act(async () => { getByRole('button').click() })
    expect(signOut).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/login')
  })
})
