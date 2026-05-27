/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { McheyneReadingPlanAttribution } from '@/components/McheyneReadingPlanAttribution'
import { MCHEYNE_COPYRIGHT_ANCHOR_ID } from '@/lib/mcheyne/mcheyneCopyrightAttribution'

describe('McheyneReadingPlanAttribution', () => {
  it('renders title, anchor id, and schedule source link', () => {
    render(<McheyneReadingPlanAttribution />)

    expect(document.getElementById(MCHEYNE_COPYRIGHT_ANCHOR_ID)).toBeInTheDocument()
    expect(screen.getByText(/Robert Murray M'Cheyne, Bible Reading Plan/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'mcheyne-api' })).toHaveAttribute(
      'href',
      'https://github.com/speric/mcheyne-api/blob/master/plan.json'
    )
  })
})
