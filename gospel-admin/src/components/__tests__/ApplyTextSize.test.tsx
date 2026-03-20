import React from 'react'
import { render } from '@testing-library/react'
import { ApplyTextSize } from '../ApplyTextSize'
import { TextSizeProvider } from '@/contexts/TextSizeContext'

const mockPathname = jest.fn(() => '/default')

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

describe('ApplyTextSize', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('text-size-normal', 'text-size-larger', 'text-size-largest')
    mockPathname.mockReturnValue('/default')
    localStorage.removeItem('gospel-profile-text-size')
  })

  function renderApply() {
    return render(
      <TextSizeProvider>
        <ApplyTextSize />
      </TextSizeProvider>
    )
  }

  it('applies text-size-normal on non-admin routes when preference is normal', () => {
    localStorage.setItem('gospel-profile-text-size', 'normal')
    renderApply()
    expect(document.documentElement.classList.contains('text-size-normal')).toBe(true)
  })

  it('applies text-size-larger on non-admin routes when set', () => {
    localStorage.setItem('gospel-profile-text-size', 'larger')
    renderApply()
    expect(document.documentElement.classList.contains('text-size-larger')).toBe(true)
  })

  it('removes all text-size classes on admin routes even when larger is stored', () => {
    localStorage.setItem('gospel-profile-text-size', 'larger')
    mockPathname.mockReturnValue('/admin')
    renderApply()
    expect(document.documentElement.classList.contains('text-size-larger')).toBe(false)
    expect(document.documentElement.classList.contains('text-size-normal')).toBe(false)
    expect(document.documentElement.classList.contains('text-size-largest')).toBe(false)
  })
})
