import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ScriptureHoverModal from '../ScriptureHoverModal'

jest.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({ translation: 'NIV' })
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false }
}))

describe('ScriptureHoverModal', () => {
  const originalFetch = global.fetch
  const originalMatchMedia = typeof window !== 'undefined' ? window.matchMedia : undefined

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn()
    if (typeof window !== 'undefined') {
      ;(window as any).matchMedia = jest.fn(() => ({ matches: false }))
    }
  })

  afterEach(() => {
    ;(global as any).fetch = originalFetch
    if (typeof window !== 'undefined' && originalMatchMedia) {
      ;(window as any).matchMedia = originalMatchMedia
    }
  })

  it('renders children', () => {
    render(
      <ScriptureHoverModal reference="John 3:16">
        <span>Click me</span>
      </ScriptureHoverModal>
    )
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('shows placeholder until hover and does not fetch before hover delay', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ reference: 'John 3:16', text: 'For God so loved...' }) })
    render(
      <ScriptureHoverModal reference="John 3:16" hoverDelayMs={500}>
        <span>Trigger</span>
      </ScriptureHoverModal>
    )
    const trigger = screen.getByText('Trigger').parentElement!
    fireEvent.mouseEnter(trigger)
    act(() => { jest.advanceTimersByTime(400) })
    expect(screen.queryByText(/Loading verse/)).not.toBeInTheDocument()
    act(() => { jest.advanceTimersByTime(150) })
    await waitFor(() => expect(screen.getByText(/Loading verse/)).toBeInTheDocument())
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/scripture?reference=John%203%3A16'))
    jest.useRealTimers()
  })

  it('shows scripture text when fetch succeeds', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ reference: 'John 3:16', text: 'For God so loved the world.' })
    })
    render(
      <ScriptureHoverModal reference="John 3:16" hoverDelayMs={100}>
        <span>Trigger</span>
      </ScriptureHoverModal>
    )
    fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!)
    act(() => { jest.advanceTimersByTime(100) })
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('For God so loved the world.')).toBeInTheDocument())
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows error when fetch returns not ok', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Verse not found' })
    })
    render(
      <ScriptureHoverModal reference="Unknown 99:99" hoverDelayMs={100}>
        <span>Trigger</span>
      </ScriptureHoverModal>
    )
    fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!)
    act(() => { jest.advanceTimersByTime(100) })
    await waitFor(() => expect(screen.getByText(/Error loading verse/)).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Verse not found')).toBeInTheDocument())
    jest.useRealTimers()
  })

  it('shows network error when fetch throws', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    render(
      <ScriptureHoverModal reference="John 3:16" hoverDelayMs={100}>
        <span>Trigger</span>
      </ScriptureHoverModal>
    )
    fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!)
    act(() => { jest.advanceTimersByTime(100) })
    await waitFor(() => expect(screen.getByText(/Network error while fetching scripture/)).toBeInTheDocument())
    jest.useRealTimers()
  })

  it('hides modal on mouse leave', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ reference: 'John 3:16', text: 'Text' }) })
    render(
      <ScriptureHoverModal reference="John 3:16" hoverDelayMs={100}>
        <span>Trigger</span>
      </ScriptureHoverModal>
    )
    const wrapper = screen.getByText('Trigger').parentElement!
    fireEvent.mouseEnter(wrapper)
    act(() => { jest.advanceTimersByTime(100) })
    await waitFor(() => expect(screen.getByText('Text')).toBeInTheDocument())
    fireEvent.mouseLeave(wrapper)
    await waitFor(() => expect(screen.queryByText('Text')).not.toBeInTheDocument())
    jest.useRealTimers()
  })

  it('does not fetch again when scriptureData already loaded', async () => {
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ reference: 'John 3:16', text: 'Text' }) })
    render(
      <ScriptureHoverModal reference="John 3:16" hoverDelayMs={100}>
        <span>Trigger</span>
      </ScriptureHoverModal>
    )
    const wrapper = screen.getByText('Trigger').parentElement!
    fireEvent.mouseEnter(wrapper)
    act(() => { jest.advanceTimersByTime(100) })
    await waitFor(() => expect(screen.getByText('Text')).toBeInTheDocument())
    const fetchCount = (global.fetch as jest.Mock).mock.calls.length
    fireEvent.mouseLeave(wrapper)
    act(() => { jest.advanceTimersByTime(50) })
    fireEvent.mouseEnter(wrapper)
    act(() => { jest.advanceTimersByTime(100) })
    await waitFor(() => expect(screen.getByText('Text')).toBeInTheDocument())
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCount)
    jest.useRealTimers()
  })

  it('on touch-only device opens modal on long press and closes via backdrop', async () => {
    ;(window as any).matchMedia = jest.fn(() => ({ matches: true }))
    const Capacitor = require('@capacitor/core').Capacitor
    Capacitor.isNativePlatform = () => true
    jest.useFakeTimers()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ reference: 'John 3:16', text: 'Touch verse' }) })
    render(
      <ScriptureHoverModal reference="John 3:16">
        <span>Touch me</span>
      </ScriptureHoverModal>
    )
    const wrapper = screen.getByText('Touch me').parentElement!
    fireEvent.touchStart(wrapper, { changedTouches: [{ clientX: 100, clientY: 200 }] })
    act(() => { jest.advanceTimersByTime(500) })
    fireEvent.touchEnd(wrapper, { preventDefault: jest.fn(), stopPropagation: jest.fn() })
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Touch verse')).toBeInTheDocument())
    const backdrop = document.querySelector('.fixed.inset-0.z-40')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)
    await waitFor(() => expect(screen.queryByText('Touch verse')).not.toBeInTheDocument())
    jest.useRealTimers()
  })
})
