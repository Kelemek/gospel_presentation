import React, { createRef } from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'
import ProfileResourceInPageSearch from '../ProfileResourceInPageSearch'
import { RESOURCE_SEARCH_MATCH_ATTR } from '@/lib/profileResourceInPageSearch'

describe('ProfileResourceInPageSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    jest.useRealTimers()
    document.body.innerHTML = ''
  })

  function renderPanel(open = true, resourceKey = 'default') {
    const contentRootRef = createRef<HTMLElement>()
    const main = document.createElement('main')
    main.innerHTML = '<p>hello world hello</p>'
    document.body.appendChild(main)
    contentRootRef.current = main

    const onOpenChange = jest.fn()
    const utils = render(
      <ProfileResourceInPageSearch
        key={resourceKey}
        open={open}
        onOpenChange={onOpenChange}
        contentRootRef={contentRootRef}
      />
    )
    return { ...utils, contentRootRef, onOpenChange, main }
  }

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
      <ProfileResourceInPageSearch
        key="default"
        open={false}
        onOpenChange={jest.fn()}
        contentRootRef={contentRootRef}
      />
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
      <ProfileResourceInPageSearch
        key="profile-a"
        open
        onOpenChange={jest.fn()}
        contentRootRef={contentRootRef}
      />
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
      <ProfileResourceInPageSearch
        key="profile-b"
        open
        onOpenChange={jest.fn()}
        contentRootRef={contentRootRef}
      />
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
    const input = screen.getByRole('searchbox', { name: 'Search in resource' })
    fireEvent.change(input, { target: { value: 'hello' } })
    act(() => {
      jest.advanceTimersByTime(250)
    })

    rerender(
      <ProfileResourceInPageSearch
        key="profile-a"
        open={false}
        onOpenChange={jest.fn()}
        contentRootRef={contentRootRef}
      />
    )
    rerender(
      <ProfileResourceInPageSearch
        key="profile-a"
        open
        onOpenChange={jest.fn()}
        contentRootRef={contentRootRef}
      />
    )

    expect(input).toHaveValue('hello')
    act(() => {
      jest.advanceTimersByTime(250)
    })
    expect(mainMarks()).toHaveLength(1)
  })

  it('closes on Escape', () => {
    const { onOpenChange } = renderPanel()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Search in resource' }), {
      key: 'Escape',
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

function mainMarks(): NodeListOf<Element> {
  return document.querySelectorAll(`main mark[${RESOURCE_SEARCH_MATCH_ATTR}]`)
}
