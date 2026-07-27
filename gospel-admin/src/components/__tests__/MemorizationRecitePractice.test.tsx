/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { MemorizationRecitePractice } from '@/components/MemorizationRecitePractice'
import { buildMemorizationTokens, getTypableTokenIndices } from '@/lib/memorizationPracticeUtils'

const mockStartRecording = jest.fn()
const mockStopRecordingCapture = jest.fn()
const mockTranscribe = jest.fn()
const mockCancelRecording = jest.fn()

jest.mock('@/hooks/useMemorizationRecite', () => ({
  useMemorizationRecite: () => ({
    startRecording: mockStartRecording,
    stopRecordingCapture: mockStopRecordingCapture,
    transcribeCapturedRecording: mockTranscribe,
    cancelRecording: mockCancelRecording,
  }),
}))

describe('MemorizationRecitePractice', () => {
  const tokens = buildMemorizationTokens('For God so loved the world', 'John 3:16')
  const typableIndices = getTypableTokenIndices(tokens)

  beforeEach(() => {
    mockStartRecording.mockReset()
    mockStopRecordingCapture.mockReset()
    mockTranscribe.mockReset()
    mockCancelRecording.mockReset()
    mockStartRecording.mockResolvedValue(undefined)
    mockStopRecordingCapture.mockResolvedValue({
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      audioSeconds: 2,
    })
    mockTranscribe.mockResolvedValue('For God so loved the world John 3 16')
  })

  it('renders ready instructions when active', () => {
    render(
      <MemorizationRecitePractice
        active
        tokens={tokens}
        typableIndices={typableIndices}
        reference="John 3:16"
        translation="esv"
        itemId="mem-1"
        roundIndex={1}
        hiddenIndices={new Set(typableIndices)}
        revealed={new Set()}
        hintPeekIndices={new Set()}
      />
    )
    expect(screen.getByTestId('memorize-recite-panel')).toBeInTheDocument()
    expect(screen.getByText(/Say the/)).toBeInTheDocument()
    expect(screen.getByTestId('memorize-recite-round-header')).toHaveTextContent('Round 1')
  })
})
