/**
 * Navigation + scripture modal smoke tests (pins are localStorage-only).
 */
import '@/lib/testing/profileContentTestMocks'
import React, { type ReactElement } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextSizeProvider } from '@/contexts/TextSizeContext'
import { gospelStorageGetSync, gospelStorageSetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { loadVersePins, versePinStorageKey } from '@/lib/versePinStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import {
  installProfileContentFetchMock,
  profileContentTestProfileInfo,
  profileContentTestSections,
} from '@/lib/testing/profileContentTestMocks'
import ProfileContent from '@/app/[slug]/ProfileContent'

function renderWithTextSize(ui: ReactElement) {
  return render(<TextSizeProvider>{ui}</TextSizeProvider>)
}

const sectionsPayload = [
  {
    ...profileContentTestSections[0],
    subsections: [
      {
        ...profileContentTestSections[0].subsections[0],
        scriptureReferences: [
          { reference: 'John 3:16', favorite: false },
          { reference: 'John 4:1', favorite: false },
        ],
      },
    ],
  },
]

const profileInfo = profileContentTestProfileInfo

describe('ProfileContent navigation & pins', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    installProfileContentFetchMock()
  })

  test('clicking scripture opens modal', async () => {
    const user = userEvent.setup()

    renderWithTextSize(
      <ProfileContent sections={sectionsPayload as never} profileInfo={profileInfo} />
    )

    const john = await screen.findByRole('button', { name: /^John 3:16$/i })
    await user.click(john)

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /john 3:16\. choose another passage/i })
      ).toBeInTheDocument()
    )
  })

  test('persists bookmark color for prior passage when navigating next without closing modal', async () => {
    const user = userEvent.setup()

    renderWithTextSize(
      <ProfileContent sections={sectionsPayload as never} profileInfo={profileInfo} />
    )

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))
    await user.click(await screen.findByRole('button', { name: /^Pin color:/i }))
    await user.click(screen.getByRole('option', { name: /^Red pin$/i }))
    await user.click(screen.getByRole('button', { name: /next scripture/i }))

    await waitFor(() => {
      const pins = loadVersePins('p1')
      expect(pins.bookmarks.some((b) => b.colorId === 'red' && b.reference === 'John 3:16')).toBe(true)
      expect(pins.yellow?.reference).toBe('John 4:1')
    })
  })

  test('advances yellow pin when navigating to next scripture without closing modal', async () => {
    const user = userEvent.setup()

    renderWithTextSize(
      <ProfileContent sections={sectionsPayload as never} profileInfo={profileInfo} />
    )

    await user.click(await screen.findByRole('button', { name: /^John 3:16$/i }))
    await screen.findByRole('button', { name: /next scripture/i })

    await user.click(screen.getByRole('button', { name: /next scripture/i }))

    await waitFor(() => {
      const yellow = loadVersePins('p1').yellow
      expect(yellow?.reference).toBe('John 4:1')
      expect(yellow?.sectionId).toBe('section-1')
      expect(yellow?.subsectionId).toBe('section-1-0')
    })
  })

  test('removing verse pin invokes onRemove handler', async () => {
    const user = userEvent.setup()

    gospelStorageSetSync(
      versePinStorageKey('p1'),
      JSON.stringify({
        v: 2,
        yellow: null,
        bookmarks: [
          {
            id: 'bm-red-1',
            colorId: 'red',
            reference: 'John 3:16',
            sectionId: 'section-1',
            subsectionId: 'section-1-0',
          },
        ],
      })
    )

    renderWithTextSize(
      <ProfileContent sections={sectionsPayload as never} profileInfo={profileInfo} />
    )

    const unpinBtn = await screen.findByRole('button', { name: /remove red pin/i })
    await user.click(unpinBtn)

    await waitFor(() => expect(gospelStorageGetSync(versePinStorageKey('p1'))).toBeNull())
  })
})
