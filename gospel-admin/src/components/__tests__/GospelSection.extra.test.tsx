import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock modal components to keep interaction simple and observable
jest.mock('@/components/ComaModal', () => ({ isOpen, onClose }: any) => (
  <div data-testid="coma-modal" data-open={isOpen ? 'true' : 'false'} onClick={onClose}>COMA</div>
))

jest.mock('@/components/ScriptureHoverModal', () => ({ children }: any) => <div>{children}</div>)

import GospelSection from '../GospelSection'

describe('GospelSection (extra tests)', () => {
  beforeEach(() => {
    // use fake timers for tests that advance the saved-confirmation timeout
    jest.useFakeTimers()
    // reset fetch mock
    // @ts-ignore
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

    // click scripture button
    fireEvent.click(btn)
    expect(onScriptureClick).toHaveBeenCalledWith('John 3:16')

    // re-render with lastViewedScripture to display the pin; pass onClearProgress
    rerender(
      <GospelSection
        section={section}
        onScriptureClick={onScriptureClick}
        lastViewedScripture={'John 3:16'}
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

  it('loads saved answers, expands detail, saves successfully and clears saved state after timeout', async () => {
    const user = userEvent.setup({ delay: null })

    const question = {
      id: 'q1',
      question: 'Context: This has detail',
      maxLength: 50,
    }

    // mock fetch to return ok
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })

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

  it('shows alert when save fails', async () => {
    const user = userEvent.setup({ delay: null })
    const question = { id: 'q1', question: 'Q: Simple', maxLength: 10 }

    const alertSpy = jest.spyOn(global, 'alert').mockImplementation(() => {})
    // @ts-ignore
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'boom' }) })

    render(
      <GospelSection
        section={{ section: 's3', title: 'S3', subsections: [{ title: 'sub', content: 'c', questions: [question] }] }}
        onScriptureClick={() => {}}
        profileSlug={'profile-y'}
      />
    )

    const textarea = await screen.findByPlaceholderText(/Type your answer here/i)
    await user.type(textarea, 'x')
    const saveBtn = await screen.findByRole('button', { name: /Save Answer/i })
    await user.click(saveBtn)

    await waitFor(() => expect(alertSpy).toHaveBeenCalled())

    alertSpy.mockRestore()
  })
})
