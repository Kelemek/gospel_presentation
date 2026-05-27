import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import McheyneReadingPlanModal from '../McheyneReadingPlanModal'
import { assignYellowLastViewed } from '@/lib/versePinStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import {
  mcheyneCalendarShortTitleForMonthDay,
  mcheyneCalendarShortTitleForPlanDay,
  mcheyneCalendarTitleForMonthDay,
  mcheynePlanDayForCalendarMonthDay,
  mcheynePlanDayForLocalDate,
} from '@/lib/mcheyne/mcheyneCalendar'

beforeEach(() => {
  resetGospelClientStorageForTests()
  installTestLocalStorage()
})

describe('McheyneReadingPlanModal', () => {
  it('calls onNavigateToPlanDay with today plan day when Today is clicked', () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    const planDay = mcheynePlanDayForLocalDate(now)
    expect(planDay).not.toBeNull()

    const onNavigateToPlanDay = jest.fn()
    render(
      <McheyneReadingPlanModal
        isOpen
        onClose={jest.fn()}
        onNavigateToPlanDay={onNavigateToPlanDay}
        onNavigateToLatest={jest.fn()}
      />
    )

    const todayDateLabel = mcheyneCalendarShortTitleForMonthDay(month, day)
    fireEvent.click(screen.getByRole('button', { name: `Today — ${todayDateLabel}` }))
    expect(onNavigateToPlanDay).toHaveBeenCalledWith(planDay)
  })

  it('calls onNavigateToPlanDay for a calendar day', () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const dayNum = Math.min(now.getDate(), 15)
    const planDay = mcheynePlanDayForCalendarMonthDay(month, dayNum)
    const calTitle = mcheyneCalendarTitleForMonthDay(month, dayNum)

    const onNavigateToPlanDay = jest.fn()
    render(
      <McheyneReadingPlanModal
        isOpen
        onClose={jest.fn()}
        onNavigateToPlanDay={onNavigateToPlanDay}
        onNavigateToLatest={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: calTitle! }))
    expect(onNavigateToPlanDay).toHaveBeenCalledWith(planDay)
  })

  it('disables Resume when no yellow pin', () => {
    render(
      <McheyneReadingPlanModal
        isOpen
        onClose={jest.fn()}
        onNavigateToPlanDay={jest.fn()}
        onNavigateToLatest={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /Resume unavailable without a pinned passage/i })).toBeDisabled()
  })

  it('calls onNavigateToLatest when yellow pin exists', async () => {
    assignYellowLastViewed('mchy', {
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-1',
    })

    const onNavigateToLatest = jest.fn()
    render(
      <McheyneReadingPlanModal
        isOpen
        onClose={jest.fn()}
        onNavigateToPlanDay={jest.fn()}
        onNavigateToLatest={onNavigateToLatest}
      />
    )

    const resumeDateLabel = mcheyneCalendarShortTitleForPlanDay(1)
    const resume = await screen.findByRole('button', {
      name: `Resume — ${resumeDateLabel}, your last pinned passage`,
    })
    expect(resume.className).toMatch(/border-blue-600/)
    fireEvent.click(resume)
    expect(onNavigateToLatest).toHaveBeenCalledTimes(1)
  })

  it('Feb 29 is not clickable in February', () => {
    render(
      <McheyneReadingPlanModal
        isOpen
        onClose={jest.fn()}
        onNavigateToPlanDay={jest.fn()}
        onNavigateToLatest={jest.fn()}
      />
    )
    const now = new Date()
    const clicksToFebruary = (1 - now.getMonth() + 12) % 12
    for (let i = 0; i < clicksToFebruary; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Next month/i }))
    }
    expect(screen.getByText('February')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /February 29/i })).not.toBeInTheDocument()
    expect(mcheynePlanDayForCalendarMonthDay(2, 29)).toBeNull()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn()
    const { container } = render(
      <McheyneReadingPlanModal
        isOpen
        onClose={onClose}
        onNavigateToPlanDay={jest.fn()}
        onNavigateToLatest={jest.fn()}
      />
    )
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
