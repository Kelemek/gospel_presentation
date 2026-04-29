/**
 * @jest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react'
import { MemorizationReorderPanel } from '@/components/MemorizationReorderPanel'
import { buildMemorizationReorderChunks } from '@/lib/memorizationPracticeUtils'

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation(() => ({
      matches,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

describe('MemorizationReorderPanel', () => {
  const chunks = buildMemorizationReorderChunks('alpha, beta, gamma', 'Gen 1:1')
  const slotChunkIds = [1, 0, 2]
  const movable = new Set([0, 1])

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses native draggable on fine-pointer layouts', async () => {
    mockMatchMedia(false)
    const { getByTestId } = render(
      <MemorizationReorderPanel
        chunks={chunks}
        slotChunkIds={slotChunkIds}
        onSlotChunkIdsChange={jest.fn()}
        roundMovableIndices={movable}
        onInvalidDrop={jest.fn()}
      />
    )
    await waitFor(() => {
      const trues = getByTestId('memorize-reorder-list').querySelectorAll('li[draggable="true"]')
      expect(trues.length).toBe(2)
    })
    expect(chunks.length).toBe(4)
    expect(getByTestId('memorize-reorder-list').querySelectorAll('li[draggable="false"]').length).toBe(2)
  })

  it('turns off native draggable on coarse / no-hover layouts (pointer reorder; avoids WebKit long-press)', async () => {
    mockMatchMedia(true)
    const { getByTestId } = render(
      <MemorizationReorderPanel
        chunks={chunks}
        slotChunkIds={slotChunkIds}
        onSlotChunkIdsChange={jest.fn()}
        roundMovableIndices={movable}
        onInvalidDrop={jest.fn()}
      />
    )
    await waitFor(() => {
      expect(getByTestId('memorize-reorder-list').querySelector('li[draggable="true"]')).toBeNull()
    })
    expect(getByTestId('memorize-reorder-list').querySelectorAll('li').length).toBe(chunks.length)
  })
})
