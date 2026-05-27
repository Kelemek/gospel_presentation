/**
 * @jest-environment jsdom
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BiblePassagePickerModal from '@/components/BiblePassagePickerModal'

function getChapterButtons() {
  const chapterLabel = screen.getByText('Chapter')
  const wrap = chapterLabel.nextElementSibling as HTMLElement | null
  if (!wrap) throw new Error('expected chapter button row')
  return within(wrap).getAllByRole('button')
}

function getVerseButtons() {
  const verseLabel = screen.getByText('Verse')
  const wrap = verseLabel.nextElementSibling as HTMLElement | null
  if (!wrap) throw new Error('expected verse button row')
  return within(wrap).getAllByRole('button')
}

describe('BiblePassagePickerModal', () => {
  it('enables Read for chapter-only selection in reader mode', async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <BiblePassagePickerModal
        isOpen
        onClose={jest.fn()}
        confirmLabel="Read"
        requireVerse={false}
        variant="reader"
        onConfirm={onConfirm}
      />
    )

    const readBtn = screen.getByRole('button', { name: /^Read$/i })
    expect(readBtn).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /^Genesis$/i }))
    await user.click(getChapterButtons()[0])

    expect(readBtn).not.toBeDisabled()
    await user.click(readBtn)

    expect(onConfirm).toHaveBeenCalledWith('Genesis 1', { initialChapterView: true })
  })

  it('passes initialChapterView false when a verse is selected', async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <BiblePassagePickerModal
        isOpen
        onClose={jest.fn()}
        confirmLabel="Read"
        requireVerse={false}
        variant="reader"
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole('button', { name: 'New Testament' }))
    await user.click(screen.getByRole('button', { name: /^John$/i }))
    await user.click(getChapterButtons()[2])
    await user.click(getVerseButtons()[15])

    await user.click(screen.getByRole('button', { name: /^Read$/i }))

    expect(onConfirm).toHaveBeenCalledWith('John 3:16', { initialChapterView: false })
  })

  it('builds a verse range for Read', async () => {
    const onConfirm = jest.fn()
    const user = userEvent.setup()
    render(
      <BiblePassagePickerModal
        isOpen
        onClose={jest.fn()}
        confirmLabel="Read"
        requireVerse={false}
        variant="reader"
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole('button', { name: 'New Testament' }))
    await user.click(screen.getByRole('button', { name: /^John$/i }))
    await user.click(getChapterButtons()[2])
    const verses = getVerseButtons()
    await user.click(verses[15])
    await user.click(verses[17])

    await user.click(screen.getByRole('button', { name: /^Read$/i }))

    expect(onConfirm).toHaveBeenCalledWith('John 3:16-18', { initialChapterView: false })
  })
})
