import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useScriptureProgress } from '../useScriptureProgress'

function TestHarness({ profile }: { profile: any }) {
  const { trackScriptureView, resetProgress, isLoading, error } = useScriptureProgress(profile)

  return (
    <div>
      <button onClick={() => trackScriptureView('John 3:16', 's1', 'ss1')}>track</button>
      <button onClick={() => resetProgress()}>reset</button>
      <div data-testid="loading">{isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="error">{error || ''}</div>
    </div>
  )
}

describe('useScriptureProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // default fetch returns ok true
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({}) }))
  })

  test('does not call fetch when profile is null or default', async () => {
    render(<TestHarness profile={null} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('track'))
    expect(global.fetch).not.toHaveBeenCalled()

  // default profile (isDefault true) should also not call
  cleanup()
  render(<TestHarness profile={{ slug: 'p', isDefault: true }} />)
  await user.click(screen.getByText('track'))
  expect(global.fetch).not.toHaveBeenCalled()
  })

  test('tracks scripture view successfully for non-default profile', async () => {
    const profile = { slug: 'p1', isDefault: false }
    // @ts-ignore
    global.fetch = jest.fn((url, opts) => {
      expect(url).toContain(`/api/profiles/${profile.slug}/scripture-progress`)
      expect(opts && (opts as any).method).toBe('POST')
      return Promise.resolve({ ok: true })
    })

    render(<TestHarness profile={profile} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('track'))

    // wait for isLoading to settle
    await screen.findByTestId('loading')
    expect(global.fetch).toHaveBeenCalled()
  })

  test('resetProgress sets error when delete fails', async () => {
    const profile = { slug: 'p2', isDefault: false }
    // @ts-ignore
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500 }))

    render(<TestHarness profile={profile} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('reset'))

    // error should appear
    const err = await screen.findByTestId('error')
    expect(err.textContent).toMatch(/Failed to reset progress|Failed to track scripture progress|Failed to reset progress/i)
  })
})
