import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemorizationWordChoicesFooter } from '@/components/MemorizationWordChoicesFooter'

const eightLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

describe('MemorizationWordChoicesFooter', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('emits guess when a choice is clicked', async () => {
    const user = userEvent.setup()
    const onGuess = jest.fn()
    render(
      <MemorizationWordChoicesFooter
        labels={['faith', 'hope', 'love']}
        targetKind="word"
        onGuess={onGuess}
      />
    )
    await user.click(screen.getByRole('button', { name: 'hope' }))
    expect(onGuess).toHaveBeenCalledWith('hope')
  })

  it('renders three rows on narrow viewports', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia

    render(<MemorizationWordChoicesFooter labels={eightLabels} targetKind="word" onGuess={jest.fn()} />)
    expect(screen.getAllByTestId('memorize-word-choice-row')).toHaveLength(3)
  })

  it('renders two rows on comfortable viewports', () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia

    render(<MemorizationWordChoicesFooter labels={eightLabels} targetKind="word" onGuess={jest.fn()} />)
    expect(screen.getAllByTestId('memorize-word-choice-row')).toHaveLength(2)
  })

  it('updates row count when the viewport media query changes', async () => {
    const listeners: Record<string, (event: MediaQueryListEvent) => void> = {}
    const mql = {
      matches: false,
      addEventListener: jest.fn((event: string, fn: (event: MediaQueryListEvent) => void) => {
        listeners[event] = fn
      }),
      removeEventListener: jest.fn(),
    }
    window.matchMedia = jest.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia

    render(
      <MemorizationWordChoicesFooter labels={eightLabels} targetKind="word" onGuess={jest.fn()} />
    )
    expect(screen.getAllByTestId('memorize-word-choice-row')).toHaveLength(3)

    mql.matches = true
    listeners.change?.({ matches: true } as MediaQueryListEvent)
    await waitFor(() => {
      expect(screen.getAllByTestId('memorize-word-choice-row')).toHaveLength(2)
    })
  })
})
