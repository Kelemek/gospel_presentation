import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DailyVerseChallengeCard from '@/components/DailyVerseChallengeCard'
import { GOSPEL_CLIENT_STORAGE_CHANGED_EVENT } from '@/lib/gospelClientStorageEvents'
import { gospelStorageGetSync } from '@/lib/gospelClientStorage'
import {
  DAILY_VERSE_CHALLENGE_STORAGE_KEY,
  getLocalDateKey,
  saveDailyVerseChallengeCompletion,
} from '@/lib/dailyVerseChallenge'
import { installTestLocalStorage, resetGospelStorageTestState } from '@/lib/testing/testLocalStorage'
import fixturePrompts from '../../../data/daily-verse-challenge/prompts.fixtures.json'

jest.mock('@/lib/dailyVerseChallenge', () => {
  const actual = jest.requireActual('@/lib/dailyVerseChallenge')
  return {
    ...actual,
    loadDailyVersePrompts: () => fixturePrompts.prompts,
    getTodayPrompt: (prompts: typeof fixturePrompts.prompts) => {
      const dateKey = actual.getLocalDateKey()
      const index = actual.hashDateKey(dateKey) % prompts.length
      return prompts[index] ?? null
    },
  }
})

describe('DailyVerseChallengeCard', () => {
  const originalFetch = global.fetch

  beforeEach(async () => {
    installTestLocalStorage()
    await resetGospelStorageTestState()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        text: '[16] For God so loved the world, that he gave his only Son.',
        reference: 'John 3:16',
        translation: 'esv',
      }),
    }) as jest.Mock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('renders collapsed by default with title and masked reference', () => {
    render(<DailyVerseChallengeCard completedVersion={0} />)

    expect(screen.getByRole('region', { name: 'Daily Verse Hunt' })).toBeInTheDocument()
    expect(screen.getByText('Daily Verse Hunt')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Expand Daily Verse Hunt' })
    ).toHaveAttribute('aria-expanded', 'false')
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.queryByText('(ESV)')).not.toBeInTheDocument()
  })

  it('fetches ESV snippet when expanded', async () => {
    const user = userEvent.setup()
    render(<DailyVerseChallengeCard completedVersion={0} />)

    await user.click(screen.getByRole('button', { name: 'Expand Daily Verse Hunt' }))

    await waitFor(() => {
      expect(
        screen.getByText(/For God so loved the world, that he gave his only Son\./)
      ).toBeInTheDocument()
      expect(screen.getByText('(ESV)')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/scripture?'),
      expect.objectContaining({ cache: 'no-store' })
    )
    expect(screen.getByText(/Find this passage in the Bible reader/)).toBeInTheDocument()
  })

  it('does not show admin preview arrows for signed-out visitors', () => {
    render(<DailyVerseChallengeCard completedVersion={0} />)

    expect(
      screen.queryByRole('button', { name: 'Previous Daily Verse Hunt prompt' })
    ).not.toBeInTheDocument()
  })

  it('shows admin preview arrows when isAdmin is true and expanded', async () => {
    const user = userEvent.setup()
    render(<DailyVerseChallengeCard completedVersion={0} isAdmin />)

    await user.click(screen.getByRole('button', { name: 'Expand Daily Verse Hunt' }))

    expect(
      screen.getByRole('button', { name: 'Previous Daily Verse Hunt prompt' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Next Daily Verse Hunt prompt' })
    ).toBeInTheDocument()
  })

  it('steps to the next prompt kind when admin clicks next', async () => {
    const user = userEvent.setup()
    render(<DailyVerseChallengeCard completedVersion={0} isAdmin />)

    await user.click(screen.getByRole('button', { name: 'Expand Daily Verse Hunt' }))
    await user.click(
      screen.getByRole('button', { name: 'Next Daily Verse Hunt prompt' })
    )

    expect(screen.getByText(/verse_blank|chapter_blank|book_blank/)).toBeInTheDocument()
  })

  it('shows completed state when hunt is done today', async () => {
    const prompts = fixturePrompts.prompts
    const dateKey = getLocalDateKey()
    const index =
      require('@/lib/dailyVerseChallenge').hashDateKey(dateKey) % prompts.length
    const prompt = prompts[index]!

    saveDailyVerseChallengeCompletion({
      dateKey,
      promptId: prompt.id,
      encouragementMessage:
        'Finished! What you’ve stored in your heart is richer than anything on a screen. Well done.',
    })

    const user = userEvent.setup()
    render(<DailyVerseChallengeCard completedVersion={1} />)

    expect(screen.getByText(prompt.reference)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand Daily Verse Hunt' }))
    expect(screen.getByText(/Finished! What you’ve stored/)).toBeInTheDocument()
    expect(screen.getByText(/You found/)).toBeInTheDocument()
    expect(
      screen.getByText(/There will be a new verse to find tomorrow/)
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByText(/For God so loved the world, that he gave his only Son\./)
      ).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/scripture?'),
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('shows completed state after remote sync without completedVersion bump', async () => {
    const prompts = fixturePrompts.prompts
    const dateKey = getLocalDateKey()
    const index =
      require('@/lib/dailyVerseChallenge').hashDateKey(dateKey) % prompts.length
    const prompt = prompts[index]!

    render(<DailyVerseChallengeCard completedVersion={0} />)

    await act(async () => {
      saveDailyVerseChallengeCompletion({
        dateKey,
        promptId: prompt.id,
        encouragementMessage:
          'Finished! What you’ve stored in your heart is richer than anything on a screen. Well done.',
      })
    })

    expect(gospelStorageGetSync(DAILY_VERSE_CHALLENGE_STORAGE_KEY)).toContain(prompt.id)

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, {
          detail: { key: DAILY_VERSE_CHALLENGE_STORAGE_KEY },
        })
      )
    })

    await waitFor(() => {
      const subtitle = screen.getByText(prompt.reference)
      expect(subtitle.closest('p')).toHaveTextContent(`✓ ${prompt.reference}`)
    })
  })
})
