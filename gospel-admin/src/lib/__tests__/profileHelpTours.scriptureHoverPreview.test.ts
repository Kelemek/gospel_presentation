/**
 * @jest-environment jsdom
 */

jest.mock('driver.js', () => ({
  driver: jest.fn(() => ({
    drive: jest.fn(),
    destroy: jest.fn(),
  })),
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

import { driver } from 'driver.js'
import { runScriptureHoverPreviewFeatureTour } from '@/lib/profileHelpTours'

describe('scripture hover preview tour', () => {
  const mqlRestore = () => {
    // jsdom default
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  }

  beforeEach(() => {
    ;(driver as jest.Mock).mockClear()
    mqlRestore()
  })

  it('starts driver with a single step: intro plus embedded demo visuals', () => {
    runScriptureHoverPreviewFeatureTour()

    expect(driver).toHaveBeenCalled()
    const cfg = (driver as jest.Mock).mock.calls[0][0] as {
      steps: {
        popover?: { description?: string; side?: string; title?: string }
        onHighlightStarted?: unknown
      }[]
    }
    const steps = cfg.steps
    expect(steps.length).toBe(1)

    const step0 = steps[0]!
    expect(step0.onHighlightStarted).toEqual(expect.any(Function))

    const desc0 = step0.popover?.description ?? ''
    expect(desc0).toContain('Deuteronomy 4:35')
    expect(desc0).toContain('no other besides him')
    expect(desc0).toContain('scripture-hover-preview-tour-demo')
    expect(desc0).toContain('shvp-demo-popup-card')
    expect(desc0).not.toContain('shvp-demo-pointer--touch')
    expect(desc0).toContain('M8.5 4.466')
    expect(desc0).toContain('Desktop:</strong> with a mouse')
    expect(desc0).toContain('Phone or native app:</strong>')
    expect(desc0).toContain('bg-blue-100')
    expect(desc0).not.toContain('animated sample')
    expect(desc0).not.toContain('Live preview uses your')

    expect(step0.popover?.title).toContain('Quick verse preview')
    expect(step0.popover?.align).toBe('center')
    expect(step0.popover?.side).toBeUndefined()
  })

  it('uses finger pointer in demo when primary input has no hover', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(hover: none)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
    runScriptureHoverPreviewFeatureTour()
    const cfg = (driver as jest.Mock).mock.calls[0][0] as {
      steps: { popover?: { description?: string } }[]
    }
    const desc0 = cfg.steps[0]?.popover?.description ?? ''
    expect(desc0).toContain('shvp-demo-pointer--touch')
  })
})
