import { render } from '@testing-library/react'
import SettingsSectionChevron from '@/components/admin/SettingsSectionChevron'

describe('SettingsSectionChevron', () => {
  it('stays pointing down until the section is expanded', () => {
    const { container, rerender } = render(<SettingsSectionChevron expanded={false} />)
    const icon = container.querySelector('svg')
    expect(icon).toHaveAttribute('width', '22')
    expect(icon).toHaveAttribute('height', '22')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).not.toHaveClass('rotate-180')

    rerender(<SettingsSectionChevron expanded />)
    expect(container.querySelector('svg')).toHaveClass('rotate-180')
  })
})
