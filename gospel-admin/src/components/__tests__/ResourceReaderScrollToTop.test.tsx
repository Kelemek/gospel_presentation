/**
 * @jest-environment jsdom
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ResourceReaderScrollToTop from '@/components/ResourceReaderScrollToTop'

const KINDLE_UA =
  'Mozilla/5.0 (Linux; U; en-US) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.13 Safari/535.19 Silk-Accelerated=true'

function setWindowMetrics(scrollY: number, innerHeight: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight })
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: matches && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('ResourceReaderScrollToTop', () => {
  const originalMatchMedia = window.matchMedia
  const originalUserAgent = navigator.userAgent

  beforeEach(() => {
    setWindowMetrics(0, 800)
    mockReducedMotion(false)
    window.scrollTo = jest.fn()
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    setWindowMetrics(0, 800)
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    })
    document.querySelectorAll('[aria-modal="true"]').forEach((node) => node.remove())
  })

  it('stays hidden near the top and appears after one viewport of window scroll', () => {
    setWindowMetrics(799, 800)
    const { rerender } = render(<ResourceReaderScrollToTop />)
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()

    setWindowMetrics(800, 800)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    rerender(<ResourceReaderScrollToTop />)

    const button = screen.getByRole('button', { name: 'Back to top' })
    expect(button).toHaveAttribute('data-resource-reader-scroll-top')
    expect(button.className).toContain('z-30')
    expect(button.className).toContain('safe-area-inset-bottom')
    expect(button.className).toContain('safe-area-inset-right')
    expect(button.className).toContain('focus-visible:ring-2')
    expect(button.className).toContain('min-h-11')
  })

  it('hides again when the window scrolls back near the top', () => {
    setWindowMetrics(900, 800)
    render(<ResourceReaderScrollToTop />)
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument()

    setWindowMetrics(799, 800)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()
  })

  it('scrolls the window to the true top', () => {
    setWindowMetrics(1600, 800)
    render(<ResourceReaderScrollToTop />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' })
  })

  it('scrolls immediately when reduced motion is requested', () => {
    setWindowMetrics(1600, 800)
    mockReducedMotion(true)
    window.scrollTo = jest.fn(() => {
      setWindowMetrics(0, 800)
    })
    render(<ResourceReaderScrollToTop />)
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()
  })

  it('removes the window scroll listener when the reader unmounts', () => {
    const add = jest.spyOn(window, 'addEventListener')
    const remove = jest.spyOn(window, 'removeEventListener')
    const disconnect = jest.spyOn(MutationObserver.prototype, 'disconnect')

    const { unmount } = render(<ResourceReaderScrollToTop />)
    const scrollAdd = add.mock.calls.find((call) => call[0] === 'scroll')
    const resizeAdd = add.mock.calls.find((call) => call[0] === 'resize')
    expect(scrollAdd?.[1]).toEqual(expect.any(Function))
    expect(resizeAdd?.[1]).toEqual(expect.any(Function))

    unmount()

    expect(remove).toHaveBeenCalledWith('scroll', scrollAdd?.[1])
    expect(remove).toHaveBeenCalledWith('resize', resizeAdd?.[1])
    expect(disconnect).toHaveBeenCalled()

    setWindowMetrics(2000, 800)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()

    add.mockRestore()
    remove.mockRestore()
    disconnect.mockRestore()
  })

  it('hides while a modal overlay is open', async () => {
    setWindowMetrics(1600, 800)
    render(<ResourceReaderScrollToTop />)
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument()

    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    await act(async () => {
      document.body.appendChild(overlay)
      await Promise.resolve()
    })

    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()

    await act(async () => {
      overlay.remove()
      await Promise.resolve()
    })
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument()
  })

  it('does not render on a Kindle browser', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: KINDLE_UA })
    setWindowMetrics(1600, 800)
    render(<ResourceReaderScrollToTop />)
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()
  })

  it('is mounted on the shared profile reader and not on Kindle read mode', () => {
    const readPage = readFileSync(path.join(process.cwd(), 'src/app/[slug]/read/page.tsx'), 'utf8')
    const readLayout = readFileSync(
      path.join(process.cwd(), 'src/app/[slug]/read/layout.tsx'),
      'utf8'
    )
    const profileContent = readFileSync(
      path.join(process.cwd(), 'src/app/[slug]/ProfileContent.tsx'),
      'utf8'
    )

    expect(readPage).not.toContain('ResourceReaderScrollToTop')
    expect(readLayout).not.toContain('ResourceReaderScrollToTop')
    expect(profileContent).toContain('ResourceReaderScrollToTop')
  })
})
