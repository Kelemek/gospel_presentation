/** @jest-environment jsdom */

import type { GospelSection } from '@/lib/types'
import {
  captureReadingPositionAtViewport,
  collapsedPlainOffsetBeforeListenBoundary,
  collapsedPlainOffsetFromRawListenOffset,
  excerptAroundPlainOffset,
  isReadingPositionAheadOf,
  plainOffsetAtViewportSentenceStart,
  profileReadingLineViewportY,
  READING_POSITION_VIEWPORT_LINE_GAP_PX,
  restoreReadingPosition,
  shouldRestoreProfileMenuReadingTop,
} from '../profileReadingPosition'
import { getProfileHeaderScrollOffset, scrollToProfileMenuReadingTopWhenReady, scrollToTocAnchorWhenReady } from '../scrollToTocAnchor'
import { plainTextForProfileResourceListen, visibleListenRawText } from '../profileResourceListenText'
import { readAlongTextFingerprint } from '../profileReadAlongProgressStorage'
import { scrollPlainOffsetToViewportY } from '../scrollReadAlongPlain'
import { splitListenRawIntoTtsChunksWithOffsets } from '../splitTextForTtsChunks'

jest.mock('../scrollToTocAnchor', () => {
  const actual = jest.requireActual('../scrollToTocAnchor')
  return {
    ...actual,
    scrollToTocAnchorWhenReady: jest.fn(),
    scrollToProfileMenuReadingTopWhenReady: jest.fn(),
  }
})

jest.mock('../scrollReadAlongPlain', () => ({
  scrollPlainOffsetToViewportY: jest.fn(),
  getCaretClientRectForReadAlongPlainOffset: jest.fn(),
}))

describe('profileReadingPosition', () => {
  it('maps DOM boundary to collapsed plain offset', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>Hello world</p><p>Second block</p>'
    document.body.appendChild(scope)

    const p = scope.querySelector('p')!
    const textNode = p.firstChild as Text
    const offset = collapsedPlainOffsetBeforeListenBoundary(scope, textNode, 6)
    const plain = plainTextForProfileResourceListen(scope)
    expect(plain).toBe('Hello world Second block')
    expect(offset).toBe(6)
    expect(plain.slice(Math.max(0, offset - 2), offset + 2)).toContain(' w')

    document.body.removeChild(scope)
  })

  it('collapsedPlainOffsetFromRawListenOffset matches forward walk budget', () => {
    const scope = document.createElement('div')
    scope.textContent = 'Alpha\n\nBeta'
    document.body.appendChild(scope)

    const plain = plainTextForProfileResourceListen(scope)
    expect(plain).toBe('Alpha Beta')
    const mid = collapsedPlainOffsetFromRawListenOffset(scope, 8, undefined)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(plain.length)

    document.body.removeChild(scope)
  })

  it('profileReadingLineViewportY matches header offset plus gap', () => {
    expect(profileReadingLineViewportY()).toBe(
      getProfileHeaderScrollOffset() + READING_POSITION_VIEWPORT_LINE_GAP_PX
    )
  })

  it('plainOffsetAtViewportSentenceStart snaps to TTS chunk start at read line', () => {
    const scope = document.createElement('div')
    scope.innerHTML = '<p>First sentence. Second sentence.</p>'
    document.body.appendChild(scope)

    const raw = visibleListenRawText(scope)
    const chunks = splitListenRawIntoTtsChunksWithOffsets(raw)
    expect(chunks).toHaveLength(2)

    const p = scope.querySelector('p')!
    const textNode = p.firstChild as Text
    const secIdx = (textNode.textContent ?? '').indexOf('Second')

    const caretRangeFromPoint = jest.fn(() => {
      const range = document.createRange()
      range.setStart(textNode, secIdx + 3)
      range.collapse(true)
      return range
    })
    document.caretRangeFromPoint = caretRangeFromPoint as typeof document.caretRangeFromPoint

    const offset = plainOffsetAtViewportSentenceStart(scope, chunks)
    expect(offset).toBe(chunks[1]!.plainStart)
    expect(chunks[0]!.text).toBe('First sentence.')
    expect(chunks[1]!.text).toBe('Second sentence.')

    document.body.removeChild(scope)
    delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint
  })

  it('captureReadingPositionAtViewport uses offset 0 at document top without binary search', () => {
    const sections = [
      {
        section: 1,
        title: 'One',
        subsections: [{ title: 'Sub', scriptureReferences: [], nestedSubsections: [] }],
      },
    ] as GospelSection[]

    const scope = document.createElement('div')
    scope.id = 'section-1'
    scope.innerHTML = '<p>' + 'word '.repeat(2000) + '</p>'
    document.body.appendChild(scope)
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })

    const captured = captureReadingPositionAtViewport(sections, 'default')
    expect(captured?.anchorId).toBe('section-1')
    expect(captured?.plainOffset).toBe(0)

    document.body.removeChild(scope)
  })

  it('excerptAroundPlainOffset trims and adds ellipses', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz'.repeat(4)
    const excerpt = excerptAroundPlainOffset(text, 60)
    expect(excerpt.startsWith('…') || excerpt.length <= 96).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(96)
  })

  it('isReadingPositionAheadOf compares anchor order then plain offset', () => {
    const ordered = ['section-1-0', 'section-1-1', 'section-2-0']
    expect(
      isReadingPositionAheadOf(
        { anchorId: 'section-2-0', plainOffset: 0 },
        { anchorId: 'section-1-0', plainOffset: 999 },
        ordered
      )
    ).toBe(true)
    expect(
      isReadingPositionAheadOf(
        { anchorId: 'section-1-0', plainOffset: 10 },
        { anchorId: 'section-1-0', plainOffset: 5 },
        ordered
      )
    ).toBe(true)
    expect(
      isReadingPositionAheadOf(
        { anchorId: 'section-1-0', plainOffset: 2 },
        { anchorId: 'section-1-1', plainOffset: 0 },
        ordered
      )
    ).toBe(false)
  })

  describe('restoreReadingPosition', () => {
    const mockScrollToTocAnchorWhenReady = scrollToTocAnchorWhenReady as jest.Mock
    const mockScrollToProfileMenuReadingTopWhenReady =
      scrollToProfileMenuReadingTopWhenReady as jest.Mock
    const mockScrollPlainOffsetToViewportY = scrollPlainOffsetToViewportY as jest.Mock

    beforeEach(() => {
      mockScrollToTocAnchorWhenReady.mockReset()
      mockScrollToProfileMenuReadingTopWhenReady.mockReset()
      mockScrollPlainOffsetToViewportY.mockReset()
      mockScrollToTocAnchorWhenReady.mockImplementation(
        (_anchorId: string, opts: { onDone?: () => void }) => {
          opts?.onDone?.()
          return () => {}
        }
      )
      mockScrollToProfileMenuReadingTopWhenReady.mockImplementation(
        (opts: { onDone?: () => void }) => {
          opts?.onDone?.()
          return () => {}
        }
      )
    })

    it('scrolls to menu-only top for plainOffset 0 on the first anchor', () => {
      const first = document.createElement('div')
      first.id = 'section-1'
      document.body.appendChild(first)

      const scope = document.createElement('div')
      scope.id = 'section-1'
      scope.innerHTML = '<p>Start of section text</p>'
      document.body.appendChild(scope)

      const plain = plainTextForProfileResourceListen(scope)
      const fingerprint = readAlongTextFingerprint(plain)

      restoreReadingPosition('section-1', 0, fingerprint, 'default')

      expect(mockScrollToProfileMenuReadingTopWhenReady).toHaveBeenCalled()
      expect(mockScrollToTocAnchorWhenReady).not.toHaveBeenCalled()
      expect(mockScrollPlainOffsetToViewportY).not.toHaveBeenCalled()

      document.body.innerHTML = ''
    })

    it('scrolls to anchor for plainOffset 0 on a non-first section', () => {
      const first = document.createElement('div')
      first.id = 'section-1'
      document.body.appendChild(first)

      const scope = document.createElement('div')
      scope.id = 'section-50-0'
      scope.innerHTML = '<p>Later section start</p>'
      document.body.appendChild(scope)

      const plain = plainTextForProfileResourceListen(scope)
      const fingerprint = readAlongTextFingerprint(plain)

      restoreReadingPosition('section-50-0', 0, fingerprint, 'default')

      expect(mockScrollToTocAnchorWhenReady).toHaveBeenCalledWith(
        'section-50-0',
        expect.objectContaining({ behavior: 'auto' })
      )
      expect(mockScrollToProfileMenuReadingTopWhenReady).not.toHaveBeenCalled()
      expect(mockScrollPlainOffsetToViewportY).not.toHaveBeenCalled()

      document.body.innerHTML = ''
    })

    it('shouldRestoreProfileMenuReadingTop is true only for first anchor at offset 0', () => {
      const first = document.createElement('div')
      first.id = 'section-1'
      document.body.appendChild(first)

      expect(shouldRestoreProfileMenuReadingTop('section-1', 0)).toBe(true)
      expect(shouldRestoreProfileMenuReadingTop('section-50-0', 0)).toBe(false)
      expect(shouldRestoreProfileMenuReadingTop('section-1', 12)).toBe(false)

      document.body.innerHTML = ''
    })

    it('aligns mid-section plainOffset at the viewport read line', () => {
      const scope = document.createElement('div')
      scope.id = 'section-1'
      scope.innerHTML = '<p>Start of section text with more words</p>'
      document.body.appendChild(scope)

      const plain = plainTextForProfileResourceListen(scope)
      const fingerprint = readAlongTextFingerprint(plain)

      restoreReadingPosition('section-1', 8, fingerprint, 'default')

      expect(mockScrollPlainOffsetToViewportY).toHaveBeenCalledWith(
        scope,
        plain.length,
        8,
        profileReadingLineViewportY(),
        'auto',
        expect.objectContaining({ omitHeadingText: expect.any(Boolean) })
      )

      document.body.removeChild(scope)
    })

    it('skips read-line alignment for negative plainOffset', () => {
      const scope = document.createElement('div')
      scope.id = 'section-2'
      scope.innerHTML = '<p>Body</p>'
      document.body.appendChild(scope)

      const plain = plainTextForProfileResourceListen(scope)
      const fingerprint = readAlongTextFingerprint(plain)

      restoreReadingPosition('section-2', -1, fingerprint, 'default')

      expect(mockScrollPlainOffsetToViewportY).not.toHaveBeenCalled()

      document.body.removeChild(scope)
    })
  })
})
