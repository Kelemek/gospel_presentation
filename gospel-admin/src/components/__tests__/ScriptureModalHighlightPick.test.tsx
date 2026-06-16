import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScriptureModalHighlightPick from '../ScriptureModalHighlightPick'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { loadScriptureHighlights } from '@/lib/profileHighlightsStorage'

describe('ScriptureModalHighlightPick', () => {
  beforeEach(() => {
    installTestLocalStorage()
  })

  it('saves highlight when color is chosen', async () => {
    const user = userEvent.setup()
    const onChanged = jest.fn()
    render(
      <ScriptureModalHighlightPick
        reference="John 3:16"
        passageText="[16] For God so loved the world"
        disabled={false}
        onChanged={onChanged}
      />
    )
    await user.click(screen.getByRole('button', { name: /Highlight color/i }))
    await user.click(screen.getByRole('option', { name: 'Red highlight' }))
    expect(loadScriptureHighlights()).toHaveLength(1)
    expect(loadScriptureHighlights()[0]!.colorId).toBe('red')
    expect(onChanged).toHaveBeenCalled()
  })

  it('saves yellow highlight when chosen', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalHighlightPick
        reference="Psalm 23:1"
        passageText="[1] The Lord is my shepherd"
        disabled={false}
      />
    )
    await user.click(screen.getByRole('button', { name: /Highlight color/i }))
    await user.click(screen.getByRole('option', { name: 'Yellow highlight' }))
    expect(loadScriptureHighlights()[0]!.colorId).toBe('yellow')
  })

  it('removes highlight when same color is chosen again', async () => {
    const user = userEvent.setup()
    render(
      <ScriptureModalHighlightPick
        reference="John 3:16"
        passageText="[16] For God so loved the world"
        disabled={false}
      />
    )
    await user.click(screen.getByRole('button', { name: /Highlight color/i }))
    await user.click(screen.getByRole('option', { name: 'Blue highlight' }))
    await user.click(screen.getByRole('button', { name: /Highlight color/i }))
    await user.click(screen.getByRole('option', { name: 'Blue highlight' }))
    expect(loadScriptureHighlights()).toHaveLength(0)
  })
})
