import { render, screen } from '@testing-library/react'
import { DailyVerseHuntSuccessContent } from '@/components/DailyVerseHuntSuccessContent'

describe('DailyVerseHuntSuccessContent', () => {
  it('renders encouragement, checkmark, reference, and tomorrow note', () => {
    render(
      <DailyVerseHuntSuccessContent
        encouragementMessage="Well hunted."
        reference="John 3:16"
      />
    )
    expect(screen.getByText('Well hunted.')).toBeInTheDocument()
    expect(screen.getByText(/You found/)).toBeInTheDocument()
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(
      screen.getByText(/There will be a new verse to find tomorrow/)
    ).toBeInTheDocument()
  })

  it('renders verse text after the found reference when provided', () => {
    render(
      <DailyVerseHuntSuccessContent
        encouragementMessage="Well hunted."
        reference="John 3:16"
        verseText="For God so loved the world, that he gave his only Son."
      />
    )
    expect(
      screen.getByText(/For God so loved the world, that he gave his only Son\./)
    ).toBeInTheDocument()
    expect(screen.getByText('(ESV)')).toBeInTheDocument()
  })

  it('renders modal variant', () => {
    render(
      <DailyVerseHuntSuccessContent
        variant="modal"
        encouragementMessage="Nice find."
        reference="Romans 8:28"
      />
    )
    expect(screen.getByText('Nice find.')).toBeInTheDocument()
    expect(screen.getByText('Romans 8:28')).toBeInTheDocument()
  })
})
