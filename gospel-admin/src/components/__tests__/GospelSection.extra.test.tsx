import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock modal components to keep interaction simple and observable
jest.mock('@/components/ComaModal', () => {
  const Component = ({ isOpen, onClose }: any) => (
    <div data-testid="coma-modal" data-open={isOpen ? 'true' : 'false'} onClick={onClose}>COMA</div>
  )
  Component.displayName = 'ComaModal'
  return Component
})

jest.mock('@/components/FourRulesModal', () => {
  const Component = ({ isOpen, onClose }: any) => (
    <div data-testid="four-rules-modal" data-open={isOpen ? 'true' : 'false'} onClick={onClose}>Four Rules</div>
  )
  Component.displayName = 'FourRulesModal'
  return Component
})

jest.mock('@/components/ScriptureHoverModal', () => {
  const Component = ({ children }: any) => <div>{children}</div>
  Component.displayName = 'ScriptureHoverModal'
  return Component
})

import GospelSection from '../GospelSection'

describe('GospelSection (extra tests)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    // flush timers and restore
    try {
      jest.runOnlyPendingTimers()
    } catch (e) {
      // ignore if no pending timers
    }
    jest.useRealTimers()
    jest.resetAllMocks()
  })

  it('renders scripture button, handles click, and shows pin control that calls onRemoveVersePin', async () => {
    const onScriptureClick = jest.fn()
    const onRemoveVersePin = jest.fn()

    const section = {
      section: 's1',
      title: 'Section 1',
      subsections: [
        {
          title: 'Sub 1',
          content: 'Some content',
          scriptureReferences: [{ reference: 'John 3:16', favorite: true }],
        },
      ],
    }

    render(
      <GospelSection
        section={section}
        onScriptureClick={onScriptureClick}
        versePins={[
          {
            bookmarkId: 'bm-r1',
            colorId: 'red',
            reference: 'John 3:16',
            sectionId: 'section-s1',
            subsectionId: 'section-s1-0',
          },
        ]}
        onRemoveVersePin={onRemoveVersePin}
        profileSlug={'test-profile'}
      />
    )

    const btn = await screen.findByRole('button', { name: /^John 3:16$/i })
    expect(btn).toBeInTheDocument()

    fireEvent.click(btn)
    expect(onScriptureClick).toHaveBeenCalledWith('John 3:16', 'section-s1', 'section-s1-0')

    const pin = await screen.findByRole('button', { name: /remove red pin/i })
    expect(pin).toBeInTheDocument()
    fireEvent.click(pin)
    expect(onRemoveVersePin).toHaveBeenCalledWith({
      bookmarkId: 'bm-r1',
      colorId: 'red',
    })
  })

  it('highlights only one pill when duplicate references match a single anchored verse pin', async () => {
    const section = {
      section: 'dup',
      title: 'Dup',
      subsections: [
        { title: 'A', content: '', scriptureReferences: [{ reference: 'Rom 8:28', favorite: false }] },
        { title: 'B', content: '', scriptureReferences: [{ reference: 'Rom 8:28', favorite: false }] },
      ],
    }

    render(
      <GospelSection
        section={section}
        onScriptureClick={() => {}}
        onRemoveVersePin={jest.fn()}
        versePins={[
          {
            colorId: 'blue',
            reference: 'Rom 8:28',
            sectionId: 'section-dup',
            subsectionId: 'section-dup-1',
          },
        ]}
        profileSlug="profile-dup"
      />
    )

    const pins = screen.queryAllByRole('button', { name: /remove blue pin/i })
    expect(pins).toHaveLength(1)
  })

  it('shows pin controls for inline scripture references when versePins match anchors', async () => {
    const onScriptureClick = jest.fn()
    const onRemoveVersePin = jest.fn()

    const section = {
      section: 'inline',
      title: 'Inline',
      subsections: [
        {
          title: 'Sub',
          content: 'God is faithful (Genesis 2:18).',
        },
      ],
    }

    render(
      <GospelSection
        section={section}
        onScriptureClick={onScriptureClick}
        profileSlug="profile-inline"
        versePins={[
          {
            colorId: 'yellow',
            reference: 'Genesis 2:18',
            sectionId: 'section-inline',
            subsectionId: 'section-inline-0',
          },
        ]}
        onRemoveVersePin={onRemoveVersePin}
      />
    )

    const inlineBtn = await screen.findByTitle(/Click to view Genesis 2:18/i)
    fireEvent.click(inlineBtn)
    expect(onScriptureClick).toHaveBeenCalledWith('Genesis 2:18', 'section-inline', 'section-inline-0')

    const pin = await screen.findByRole('button', { name: /remove yellow pin/i })
    fireEvent.click(pin)
    expect(onRemoveVersePin).toHaveBeenCalledWith({ colorId: 'yellow' })
  })

  it('loads saved answers, expands detail, saves to localStorage and clears saved state after timeout', async () => {
    const user = userEvent.setup({ delay: null })

    const question = {
      id: 'q1',
      question: 'Context: This has detail',
      maxLength: 50,
    }

    const setItem = jest.spyOn(Storage.prototype, 'setItem')

    render(
      <GospelSection
        section={{ section: 's2', title: 'S2', subsections: [{ title: 'sub', content: 'c', questions: [question] }] }}
        onScriptureClick={() => {}}
        profileSlug={'profile-x'}
        savedAnswers={[]}
      />
    )

    // toggle button present with prefix
    const toggle = await screen.findByRole('button', { name: /Context:/i })
    expect(toggle).toBeInTheDocument()

    // expand
    await user.click(toggle)
    const textarea = await screen.findByPlaceholderText(/Type your answer here/i)
    expect(textarea).toBeInTheDocument()

    await user.clear(textarea)
    await user.type(textarea, 'my answer')

    const saveBtn = await screen.findByRole('button', { name: /Save Answer/i })
    await user.click(saveBtn)

    await waitFor(() => expect(setItem).toHaveBeenCalled())

    await screen.findByText(/✓ Saved/)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(setItem).toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('renders Four Rules of Communication as button and opens Four Rules modal on click', async () => {
    const section = {
      section: 's4',
      title: 'Section',
      subsections: [
        { title: 'Sub', content: 'Review the Four Rules of Communication with your spouse.' }
      ]
    }

    render(
      <GospelSection
        section={section}
        onScriptureClick={() => {}}
        profileSlug="test"
      />
    )

    const fourRulesLink = await screen.findByText('Four Rules of Communication')
    expect(fourRulesLink).toBeInTheDocument()

    fireEvent.click(fourRulesLink)
    const modals = screen.getAllByTestId('four-rules-modal')
    const openModal = modals.find((el) => el.getAttribute('data-open') === 'true')
    expect(openModal).toBeDefined()
  })

  it('shows alert when answer exceeds max length on save', async () => {
    const user = userEvent.setup({ delay: null })
    const question = { id: 'q1', question: 'Q: Simple', maxLength: 3 }

    const { showAlert } = (global as any).__alertModalMocks

    render(
      <GospelSection
        section={{ section: 's3', title: 'S3', subsections: [{ title: 'sub', content: 'c', questions: [question] }] }}
        onScriptureClick={() => {}}
        profileSlug={'profile-y'}
      />
    )

    const textarea = await screen.findByPlaceholderText(/Type your answer here/i)
    // `maxLength` on the textarea blocks typing past the limit; set state via change like a programmatic override.
    fireEvent.change(textarea, { target: { value: 'toolong' } })
    const saveBtn = await screen.findByRole('button', { name: /Save Answer/i })
    await user.click(saveBtn)

    await waitFor(() => expect(showAlert).toHaveBeenCalled())
  })
})
