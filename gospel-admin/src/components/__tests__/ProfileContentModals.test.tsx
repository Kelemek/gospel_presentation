/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileContentModals from '@/components/ProfileContentModals'
import {
  makeProfileContentModalsProps,
  sampleMemorizedVerse,
} from '@/lib/testFixtures/profileContentModalsProps'

let lastScriptureModalProps: Record<string, unknown> | null = null
let lastBibleReaderProps: Record<string, unknown> | null = null
let lastMemorizationPracticeProps: Record<string, unknown> | null = null

jest.mock('@/components/ScriptureModal', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastScriptureModalProps = props
    return (
      <div data-testid="scripture-modal">
        {String(props.reference)}:{String(props.isOpen)}
      </div>
    )
  },
}))

jest.mock('@/components/SpurgeonSermonsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="spurgeon-modal" />,
}))

jest.mock('@/components/MorneveDevotionsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="morneve-modal" />,
}))

jest.mock('@/components/McheyneReadingPlanModal', () => ({
  __esModule: true,
  default: () => <div data-testid="mcheyne-modal" />,
}))

jest.mock('@/components/BiblePassagePickerModal', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastBibleReaderProps = props
    return (
      <div data-testid="bible-reader-modal">
        <button
          type="button"
          onClick={() =>
            (props.onConfirm as (ref: string, meta: { initialChapterView?: boolean }) => void)(
              'John 1:1',
              { initialChapterView: true }
            )
          }
        >
          Confirm reader
        </button>
      </div>
    )
  },
}))

jest.mock('@/components/MemorizationPracticeSession', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastMemorizationPracticeProps = props
    return <div data-testid="memorization-practice-modal" />
  },
}))

describe('ProfileContentModals', () => {
  beforeEach(() => {
    lastScriptureModalProps = null
    lastBibleReaderProps = null
    lastMemorizationPracticeProps = null
  })

  it('renders scripture modal from the scripture cluster', () => {
    render(<ProfileContentModals {...makeProfileContentModalsProps()} />)

    expect(screen.getByTestId('scripture-modal')).toHaveTextContent('Romans 8:1:true')
    expect(lastScriptureModalProps?.profileSlug).toBe('default')
    expect(lastScriptureModalProps?.scriptureTabAnchors).toEqual({
      sectionId: 's1',
      subsectionId: 'ss1',
    })
  })

  it('uses verse pin control when highlight picker mode is off', () => {
    render(
      <ProfileContentModals
        {...makeProfileContentModalsProps({
          scripture: { scriptureModalHighlightPicker: false, modalPinDraftColor: 'red' },
        })}
      />
    )

    expect(lastScriptureModalProps?.versePinControl).toEqual(
      expect.objectContaining({
        draftColor: 'red',
        colorsAvailableInDropdown: ['red', 'blue'],
      })
    )
    expect(lastScriptureModalProps?.scriptureHighlightControl).toBeUndefined()
  })

  it('uses highlight control when highlight picker mode is on', () => {
    const bumpHighlights = jest.fn()
    render(
      <ProfileContentModals
        {...makeProfileContentModalsProps({
          scripture: {
            scriptureModalHighlightPicker: true,
            highlightRevision: 3,
            bumpHighlights,
          },
        })}
      />
    )

    expect(lastScriptureModalProps?.scriptureHighlightControl).toEqual({
      highlightsRevision: 3,
      profileSlug: 'default',
      onChanged: bumpHighlights,
    })
    expect(lastScriptureModalProps?.versePinControl).toBeUndefined()
  })

  it('portals bible reader and forwards confirm to the study cluster', async () => {
    const user = userEvent.setup()
    const props = makeProfileContentModalsProps({
      study: {
        bibleReader: {
          isOpen: true,
          onClose: jest.fn(),
          onConfirm: jest.fn(),
        },
      },
    })

    render(<ProfileContentModals {...props} />)

    expect(screen.getByTestId('bible-reader-modal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirm reader' }))
    expect(props.study.bibleReader.onConfirm).toHaveBeenCalledWith('John 1:1', {
      initialChapterView: true,
    })
    expect(lastBibleReaderProps?.variant).toBe('reader')
  })

  it('portals memorization practice and omits study for bible-books items', () => {
    render(
      <ProfileContentModals
        {...makeProfileContentModalsProps({
          study: {
            memorizationPractice: {
              verse: {
                ...sampleMemorizedVerse,
                kind: 'bibleBooks',
                bibleBooksScope: 'ot',
              },
              onClose: jest.fn(),
              onUpdated: jest.fn(),
            },
          },
        })}
      />
    )

    expect(screen.getByTestId('memorization-practice-modal')).toBeInTheDocument()
    expect(lastMemorizationPracticeProps?.onOpenSpurgeonStudy).toBeUndefined()
  })

  it('passes onOpenSpurgeonStudy to verse memorization practice', () => {
    const props = makeProfileContentModalsProps({
      study: {
        memorizationPractice: {
          verse: sampleMemorizedVerse,
          onClose: jest.fn(),
          onUpdated: jest.fn(),
        },
      },
    })

    render(<ProfileContentModals {...props} />)

    expect(lastMemorizationPracticeProps?.onOpenSpurgeonStudy).toBe(
      props.scripture.onOpenSpurgeonStudy
    )
  })
})
