export type RecitePhase = 'ready' | 'recording' | 'stopping' | 'transcribing' | 'results'

export type ReciteAttemptMetrics = {
  wrong: number
  correct: number
  hadErrors: boolean
}

export type MemorizationRecitePracticeHandle = {
  phase: RecitePhase
  starting: boolean
  showNextRoundOption: boolean
  showFinishOption: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  applyAttemptMetrics: () => void
  prepareClose: () => Promise<void>
  resetAttemptState: () => void
  cancel: () => void
}
