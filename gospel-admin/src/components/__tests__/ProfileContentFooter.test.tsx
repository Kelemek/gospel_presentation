/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import ProfileContentFooter from '@/components/ProfileContentFooter'

describe('ProfileContentFooter', () => {
  it('renders attribution links', () => {
    render(<ProfileContentFooter enabledTranslationCodes={['esv']} />)
    expect(screen.getByRole('link', { name: 'App Info & QR Codes' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Copyright & Attribution' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toBeTruthy()
  })
})
