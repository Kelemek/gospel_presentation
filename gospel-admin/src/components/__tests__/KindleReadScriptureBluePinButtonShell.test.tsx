import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KindleReadScriptureBluePinButtonShell from '@/components/KindleReadScriptureBluePinButtonShell'
import { kindleReadBluePinButtonScriptContent } from '@/lib/kindleReadBluePinButtonScript'
import {
  isKindleReadBluePinOnRow,
  toggleKindleReadBluePin,
} from '@/lib/kindleReadBluePinStorage'

function runKindleBluePinButtonScript(): void {
   
  eval(kindleReadBluePinButtonScriptContent())
}

describe('KindleReadScriptureBluePinButtonShell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('renders nothing without a scripture card anchor', () => {
    const { container } = render(
      <KindleReadScriptureBluePinButtonShell
        from="default"
        reference="John 3:16"
        anchor="section-1-0"
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('toggles Add Pin via inline script without React hydration', async () => {
    render(
      <KindleReadScriptureBluePinButtonShell
        from="mchy"
        reference="Genesis 1"
        anchor="section-jan-0-1-card-0"
      />
    )

    runKindleBluePinButtonScript()

    const button = screen.getByRole('button', { name: 'Add Pin' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(button)

    expect(screen.getByRole('button', { name: 'Remove Pin' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(
      isKindleReadBluePinOnRow(
        'mchy',
        {
          reference: 'Genesis 1',
          sectionId: 'section-jan',
          subsectionId: 'section-jan-0-1',
        },
        { kindleAnchor: 'section-jan-0-1-card-0' }
      )
    ).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Remove Pin' }))

    expect(screen.getByRole('button', { name: 'Add Pin' })).toBeInTheDocument()
  })

  it('shows Remove Pin when the passage is already pinned', () => {
    toggleKindleReadBluePin(
      'mchy',
      {
        reference: 'Genesis 1',
        sectionId: 'section-jan',
        subsectionId: 'section-jan-0-1',
      },
      { kindleAnchor: 'section-jan-0-1-card-0' }
    )

    render(
      <KindleReadScriptureBluePinButtonShell
        from="mchy"
        reference="Genesis 1"
        anchor="section-jan-0-1-card-0"
      />
    )

    runKindleBluePinButtonScript()

    expect(screen.getByRole('button', { name: 'Remove Pin' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
