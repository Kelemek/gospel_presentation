import React, { createRef } from 'react'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileResourceInPageSearch from '../ProfileResourceInPageSearch'
import { BIBLICAL_COUNSELING_REFERENCE_SLUG } from '@/lib/biblicalCounseling/biblicalCounselingReference'
import { RESOURCE_SEARCH_MATCH_ATTR } from '@/lib/profileResourceInPageSearch'
import { PROFILE_RESOURCE_SEARCH_PANEL_ATTR } from '@/lib/scrollToTocAnchor'
import { isProfileResourceSearchContentTouchBlurHost } from '@/lib/memorizationViewportPlatform'

jest.mock('@/lib/memorizationViewportPlatform', () => ({
  ...jest.requireActual('@/lib/memorizationViewportPlatform'),
  isProfileResourceSearchContentTouchBlurHost: jest.fn(() => false),
}))

const mockIsProfileResourceSearchContentTouchBlurHost =
  isProfileResourceSearchContentTouchBlurHost as jest.MockedFunction<
    typeof isProfileResourceSearchContentTouchBlurHost
  >

describe('ProfileResourceInPageSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    jest.useRealTimers()
    document.body.innerHTML = ''
    mockIsProfileResourceSearchContentTouchBlurHost.mockReturnValue(false)
  })

  function wrapSearchPanel(props: React.ComponentProps<typeof ProfileResourceInPageSearch>) {
    return (
      <div className="relative">
        <ProfileResourceInPageSearch {...props} />
      </div>
    )
  }

  function renderPanel(open = true, resourceKey = 'default') {
    const contentRootRef = createRef<HTMLElement>()
    const main = document.createElement('main')
    main.innerHTML = '<p>hello world hello</p>'
    document.body.appendChild(main)
    contentRootRef.current = main

    const onOpenChange = jest.fn()
    const utils = render(
      wrapSearchPanel({
        key: resourceKey,
        open,
        onOpenChange,
        contentRootRef,
      })
    )
    return { ...utils, contentRootRef, onOpenChange, main }
  }

  it('marks the panel for profile header scroll offset', () => {
    renderPanel()
    expect(
      document.querySelector(`[${PROFILE_RESOURCE_SEARCH_PANEL_ATTR}]`)
    ).toBeInTheDocument()
  })

  it('focuses search input with preventScroll when opened', () => {
    const focusSpy = jest.spyOn(HTMLInputElement.prototype, 'focus')
    const contentRootRef = createRef<HTMLElement>()
    const main = document.createElement('main')
    document.body.appendChild(main)
    contentRootRef.current = main
    const onOpenChange = jest.fn()

    const { rerender } = render(
      wrapSearchPanel({
        open: false,
        onOpenChange: onOpenChange,
        contentRootRef,
      })
    )

    rerender(
      wrapSearchPanel({
        open: true,
        onOpenChange: onOpenChange,
        contentRootRef,
      })
    )

    act(() => {
      jest.runOnlyPendingTimers()
    })

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    focusSpy.mockRestore()
  })

  it('does not search until at least three characters are typed', () => {
    renderPanel()
    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    fireEvent.change(input, { target: { value: 'he' } })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(0)
    expect(screen.queryByText('No matches', { selector: '[aria-hidden="true"]' })).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'hel' } })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(1)
  })

  it('debounces search input', () => {
    renderPanel()
    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    fireEvent.change(input, { target: { value: 'hello' } })

    expect(mainMarks()).toHaveLength(0)

    act(() => {
      jest.advanceTimersByTime(250)
    })

    expect(mainMarks()).toHaveLength(1)
  })

  it('shows match count after debounced search', () => {
    renderPanel()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search in resource' }), {
      target: { value: 'hello' },
    })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(screen.getByText('1 of 2', { selector: '[aria-hidden="true"]' })).toBeInTheDocument()
  })

  it('prev/next buttons navigate matches', () => {
    renderPanel()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search in resource' }), {
      target: { value: 'hello' },
    })
    act(() => {
      jest.advanceTimersByTime(250)
    })

    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {})
    scrollSpy.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }))
    expect(scrollSpy).toHaveBeenCalled()
    expect(screen.getByText('2 of 2', { selector: '[aria-hidden="true"]' })).toBeInTheDocument()
    scrollSpy.mockRestore()
  })

  it('clears highlights when closed', () => {
    const { rerender, contentRootRef } = renderPanel(true)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search in resource' }), {
      target: { value: 'hello' },
    })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(1)

    rerender(
      wrapSearchPanel({
        key: 'default',
        open: false,
        onOpenChange: jest.fn(),
        contentRootRef,
      })
    )
    expect(mainMarks()).toHaveLength(0)
  })

  it('clears query when switching to another resource profile', () => {
    const contentRootRef = createRef<HTMLElement>()
    const mainA = document.createElement('main')
    mainA.innerHTML = '<p>alpha alpha</p>'
    document.body.appendChild(mainA)
    contentRootRef.current = mainA

    const { rerender } = render(
      wrapSearchPanel({
        key: 'profile-a',
        open: true,
        onOpenChange: jest.fn(),
        contentRootRef,
      })
    )
    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    fireEvent.change(input, { target: { value: 'alpha' } })
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(1)

    const mainB = document.createElement('main')
    mainB.innerHTML = '<p>beta beta</p>'
    document.body.appendChild(mainB)
    contentRootRef.current = mainB

    rerender(
      wrapSearchPanel({
        key: 'profile-b',
        open: true,
        onOpenChange: jest.fn(),
        contentRootRef,
      })
    )

    expect(screen.getByRole('searchbox', { name: 'Search in resource' })).toHaveValue('')
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(0)
    expect(screen.queryByText(/of /, { selector: '[aria-hidden="true"]' })).not.toBeInTheDocument()
  })

  it('keeps query when closing and reopening the same resource profile', () => {
    const { rerender, contentRootRef } = renderPanel(true, 'profile-a')
    let input = screen.getByRole('searchbox', { name: 'Search in resource' })
    fireEvent.change(input, { target: { value: 'hello' } })
    act(() => {
      jest.advanceTimersByTime(250)
    })

    rerender(
      wrapSearchPanel({
        key: 'profile-a',
        open: false,
        onOpenChange: jest.fn(),
        contentRootRef,
      })
    )
    rerender(
      wrapSearchPanel({
        key: 'profile-a',
        open: true,
        onOpenChange: jest.fn(),
        contentRootRef,
      })
    )

    input = screen.getByRole('searchbox', { name: 'Search in resource' })
    expect(input).toHaveValue('hello')
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(1)
  })

  it('shows secular term mapping hint on the counseling reference profile', async () => {
    global.fetch = jest.fn((url: RequestInfo) => {
      if (String(url).includes('/api/biblical-counseling/secular-term-map')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            pinnedSectionTitle: 'Find your topic (secular terms)',
            introHtml: '',
            mappings: [{ secularTerms: ['self-esteem'], biblicalTopic: 'Pride and Humility' }],
          }),
        })
      }
      return Promise.reject(new Error(`Unmocked fetch: ${String(url)}`))
    }) as jest.Mock

    const contentRootRef = createRef<HTMLElement>()
    const main = document.createElement('main')
    main.innerHTML =
      '<section id="section-1"><p>self-esteem maps to Pride and humility</p></section>'
    document.body.appendChild(main)
    contentRootRef.current = main

    render(
      wrapSearchPanel({
        open: true,
        onOpenChange: jest.fn(),
        contentRootRef,
        profileSlug: BIBLICAL_COUNSELING_REFERENCE_SLUG,
      })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/biblical-counseling/secular-term-map')
    })

    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    fireEvent.change(input, { target: { value: 'self-esteem' } })
    await act(async () => {
      jest.advanceTimersByTime(250)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByText(/Secular term →/)).toBeInTheDocument()
    })
    expect(screen.getByText('Pride and Humility')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const { onOpenChange } = renderPanel()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search in resource' }), {
      key: 'Escape',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('on mobile, blurs the search field when the reader touches article content', () => {
    mockIsProfileResourceSearchContentTouchBlurHost.mockReturnValue(true)
    const { main } = renderPanel()
    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    input.focus()
    expect(document.activeElement).toBe(input)

    fireEvent.touchStart(main, { touches: [{ clientX: 0, clientY: 0 }] })

    expect(document.activeElement).not.toBe(input)
  })

  it('on mobile, does not blur when touch starts on the search field', () => {
    mockIsProfileResourceSearchContentTouchBlurHost.mockReturnValue(true)
    renderPanel()
    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    input.focus()

    fireEvent.touchStart(input, { touches: [{ clientX: 0, clientY: 0 }] })

    expect(document.activeElement).toBe(input)
  })
})

function mainMarks(): NodeListOf<Element> {
  return document.querySelectorAll(`main mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
}
