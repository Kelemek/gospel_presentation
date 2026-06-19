import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureChapterVersePickerDialog from '@/components/ScriptureChapterVersePickerDialog'

describe('ScriptureChapterVersePickerDialog', () => {
  it('renders verse grid and calls onRead with selection', async () => {
    const user = userEvent.setup()
    const onRead = jest.fn()
    const onVerseClick = jest.fn()

    render(
      <ScriptureChapterVersePickerDialog
        open
        onClose={jest.fn()}
        chapterReference="Genesis 1"
        selection={{ verseStart: 2, verseEnd: null }}
        onVerseClick={onVerseClick}
        onRead={onRead}
        verseCount={3}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Verse 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onVerseClick).toHaveBeenCalledWith(3)
    await user.click(screen.getByRole('button', { name: 'Read' }))
    expect(onRead).toHaveBeenCalledTimes(1)
  })

  it('shows Reading… while reading prop is true', () => {
    render(
      <ScriptureChapterVersePickerDialog
        open
        onClose={jest.fn()}
        chapterReference="Genesis 1"
        selection={{ verseStart: 2, verseEnd: null }}
        onVerseClick={jest.fn()}
        onRead={jest.fn()}
        verseCount={3}
        reading
      />
    )

    expect(screen.getByRole('button', { name: 'Reading…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Read' })).not.toBeInTheDocument()
  })
})
