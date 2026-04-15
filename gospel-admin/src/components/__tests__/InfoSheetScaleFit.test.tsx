import React from 'react'
import { render, screen } from '@testing-library/react'

import { InfoSheetScaleFit } from '../InfoSheetScaleFit'

describe('InfoSheetScaleFit', () => {
  const originalResizeObserver = global.ResizeObserver

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width: 1279px'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    })

    global.ResizeObserver = jest.fn().mockImplementation((cb: ResizeObserverCallback) => ({
      observe: (el: Element) => {
        cb([{ target: el, contentRect: { width: 400, height: 600 } } as unknown as ResizeObserverEntry], {} as ResizeObserver)
      },
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver
  })

  it('renders children when narrow (sheet layout)', () => {
    render(
      <div style={{ width: 400, height: 600 }}>
        <InfoSheetScaleFit>
          <p>Sheet inner content</p>
        </InfoSheetScaleFit>
      </div>
    )
    expect(screen.getByText('Sheet inner content')).toBeInTheDocument()
  })
})
