import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModalToolbarMenu, {
  computePortalListboxPlacement,
} from '../ScriptureModalToolbarMenu'

describe('ScriptureModalToolbarMenu', () => {
  it('opens listbox and calls onSelect when an option is chosen', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn().mockResolvedValue(undefined)
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Pick fruit"
        listboxAriaLabel="Fruits"
        value="a"
        options={[
          { value: 'a', label: 'Apple' },
          { value: 'b', label: 'Banana' },
        ]}
        onSelect={onSelect}
      />
    )
    await user.click(screen.getByRole('button', { name: /Pick fruit/i }))
    await user.click(await screen.findByRole('option', { name: 'Banana' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('sets data-tour on listbox when listboxDataTour is passed', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Compare"
        listboxAriaLabel="Compare with a translation"
        listboxDataTour="scripture-modal-compare-listbox"
        value=""
        options={[
          { value: '', label: 'Compare' },
          { value: 'KJV', label: 'KJV' },
        ]}
        onSelect={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: /Compare/i }))
    expect(screen.getByRole('listbox', { name: 'Compare with a translation' })).toHaveAttribute(
      'data-tour',
      'scripture-modal-compare-listbox'
    )
  })

  it('does not open when only one option', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Single"
        listboxAriaLabel="Only one"
        value="x"
        options={[{ value: 'x', label: 'Only' }]}
        onSelect={onSelect}
      />
    )
    await user.click(screen.getByRole('button', { name: /Single/i }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('triggerVariant form applies form-field styling on the trigger', () => {
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Feedback type"
        listboxAriaLabel="Feedback type options"
        value="suggestion"
        triggerVariant="form"
        options={[
          { value: 'suggestion', label: 'Suggestion' },
          { value: 'bug', label: 'Bug' },
        ]}
        onSelect={jest.fn()}
      />
    )
    const trigger = screen.getByRole('button', { name: /Feedback type/i })
    expect(trigger).toHaveClass('min-h-[42px]', 'rounded-lg', 'border-slate-200', 'bg-white')
    expect(trigger.querySelector('svg')).toHaveClass('h-5', 'w-5')
  })

  it('triggerVariant form applies form-field styling on the listbox', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalToolbarMenu
        ariaLabel="Feedback type"
        listboxAriaLabel="Feedback type options"
        value="suggestion"
        triggerVariant="form"
        portaledListbox
        options={[
          { value: 'suggestion', label: 'Suggestion' },
          { value: 'bug', label: 'Bug' },
        ]}
        onSelect={jest.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: /Feedback type/i }))
    const listbox = await screen.findByRole('listbox', { name: 'Feedback type options' })
    expect(listbox).toHaveClass('rounded-lg', 'border-slate-200', 'bg-white')
    expect(listbox).not.toHaveClass('border-2', 'border-slate-400', 'bg-slate-50')
  })

  it('with portaledListbox, opens listbox in a portal and still calls onSelect', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn().mockResolvedValue(undefined)
    render(
      <div style={{ overflow: 'hidden', height: 80, width: 200 }}>
        <ScriptureModalToolbarMenu
          ariaLabel="Pick fruit"
          listboxAriaLabel="Fruits"
          value="a"
          portaledListbox
          options={[
            { value: 'a', label: 'Apple' },
            { value: 'b', label: 'Banana' },
          ]}
          onSelect={onSelect}
        />
      </div>
    )
    await user.click(screen.getByRole('button', { name: /Pick fruit/i }))
    const listbox = await screen.findByRole('listbox', { name: 'Fruits' })
    expect(listbox.parentElement).toBe(document.body)
    await user.click(screen.getByRole('option', { name: 'Banana' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })
})

describe('computePortalListboxPlacement', () => {
  const listEl = (scrollHeight: number) =>
    ({ scrollHeight } as unknown as HTMLElement)

  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 600,
    })
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({ fontSize: '16px' } as CSSStyleDeclaration)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('positions above the trigger when there is not enough room below', () => {
    const trigger = new DOMRect(10, 556, 100, 44)
    const p = computePortalListboxPlacement(trigger, listEl(200))
    expect(p.top).toBeLessThan(trigger.top)
    expect(p.maxHeight).toBeUndefined()
    const bottom = p.top + 200
    expect(bottom).toBeLessThanOrEqual(trigger.top - 4)
  })

  it('opens above (not a short below panel) when the list would extend past the viewport bottom', () => {
    const trigger = new DOMRect(10, 500, 100, 44)
    const p = computePortalListboxPlacement(trigger, listEl(400))
    expect(p.top).toBeLessThan(trigger.top)
    expect(p.maxHeight).toBe(300)
    expect(p.top + 300).toBeLessThanOrEqual(trigger.top - 4 + 0.5)
  })

  it('opens below when the full list fits under the trigger', () => {
    const trigger = new DOMRect(10, 100, 100, 44)
    const p = computePortalListboxPlacement(trigger, listEl(120))
    expect(p.top).toBe(trigger.bottom + 4)
    expect(p.maxHeight).toBeUndefined()
  })
})
