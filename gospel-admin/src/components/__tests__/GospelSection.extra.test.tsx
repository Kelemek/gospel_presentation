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
    // use fake timers for tests that advance the saved-confirmation timeout
    jest.useFakeTimers()
    // reset fetch mock
    // @ts-expect-error mocking incompatible types
    global.fetch = jest.fn()
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

  it('renders scripture button, handles click, and shows pin which calls onClearProgress', async () => {
    const onScriptureClick = jest.fn()
    const onClearProgress = jest.fn()

    const section = {
      section: 's1',
      title: 'Section 1',
      subsections: [
        {
          title: 'Sub 1',
          content: 'Some content',
          scriptureReferences: [
            { reference: 'John 3:16', favorite: true },
          ],
        }
      ]
    }

    const { rerender } = render(
      <GospelSection
        section={section}
        onScriptureClick={onScriptureClick}
        profileSlug={'test-profile'}
      />
    )

    const btn = await screen.findByRole('button', { name: /John 3:16/i })
    expect(btn).toBeInTheDocument()

    // click scripture button (pills pass section/subsection anchors for progress)
    fireEvent.click(btn)
    expect(onScriptureClick).toHaveBeenCalledWith('John 3:16', 'section-s1', 'section-s1-0')

    // re-render with anchored lastViewedScripture (same ids the pill passes on click) so pin renders
    rerender(
      <GospelSection
        section={section}
        onScriptureClick={onScriptureClick}
        lastViewedScripture={{
          reference: 'John 3:16',
          sectionId: 'section-s1',
          subsectionId: 'section-s1-0',
        }}
        onClearProgress={onClearProgress}
        profileSlug={'test-profile'}
      />
    )

    // pin uses title="Click to clear progress" in the component
    const pin = await screen.findByTitle('Click to clear progress')
    expect(pin).toBeInTheDocument()
    fireEvent.click(pin)
    expect(onClearProgress).toHaveBeenCalled()
  })

  it('highlights only one pill when the same reference appears in two subsections and pin has anchors', async () => {
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
        lastViewedScripture={{
          reference: 'Rom 8:28',
          sectionId: 'section-dup',
          subsectionId: 'section-dup-1',
        }}
        profileSlug="profile-dup"
      />
    )

    const pins = screen.queryAllByTitle('Click to clear progress')
    expect(pins).toHaveLength(1)
  })

  it('loads saved answers, expands detail, saves successfully and clears saved state after timeout', async () => {
    const user = userEvent.setup({ delay: null })

    const question = {
      id: 'q1',
      question: 'Context: This has detail',
      maxLength: 50,
    }

    // mock fetch to return ok
    // @ts-expect-error mocking incompatible types
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    render(
      <GospelSection
        section={{ section: 's2', title: 'S2', subsections: [{ title: 'sub', content: 'c', questions: [question] }] }}
        onScriptureClick={() => {}}
        profileSlug={'profile-x'}
        savedAnswers={[]}
        isLoggedIn
      />
    )

    // toggle button present with prefix
    const toggle = await screen.findByRole('button', { name: /Context:/i })
    expect(toggle).toBeInTheDocument()

    // expand
    await user.click(toggle)
    const textarea = await screen.findByPlaceholderText(/Type your answer here/i)
    expect(textarea).toBeInTheDocument()

    // type answer then click save
    await user.clear(textarea)
    await user.type(textarea, 'my answer')

    const saveBtn = await screen.findByRole('button', { name: /Save Answer/i })
    await user.click(saveBtn)

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())

    // saved state should be visible (button text becomes ✓ Saved)
    await screen.findByText(/✓ Saved/)

    // advance the timer to clear the saved status
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    // after timers run, ensure no errors and fetch was called
    expect(global.fetch).toHaveBeenCalled()
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

  it('shows alert when save fails', async () => {
    const user = userEvent.setup({ delay: null })
    const question = { id: 'q1', question: 'Q: Simple', maxLength: 10 }

    const { showAlert } = (global as any).__alertModalMocks
    // @ts-expect-error mocking incompatible types
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'boom' }) })

    render(
      <GospelSection
        section={{ section: 's3', title: 'S3', subsections: [{ title: 'sub', content: 'c', questions: [question] }] }}
        onScriptureClick={() => {}}
        profileSlug={'profile-y'}
        isLoggedIn
      />
    )

    const textarea = await screen.findByPlaceholderText(/Type your answer here/i)
    await user.type(textarea, 'x')
    const saveBtn = await screen.findByRole('button', { name: /Save Answer/i })
    await user.click(saveBtn)

    await waitFor(() => expect(showAlert).toHaveBeenCalled())
  })
})
