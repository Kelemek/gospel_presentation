'use client'

import { useCallback, useRef } from 'react'
import { isWhisperReciteSupported } from '@/lib/isWhisperReciteSupported'

export const RECITE_MAX_DURATION_MS = 5 * 60 * 1000
export const RECITE_MIN_DURATION_MS = 1000
/** Brief tail after stop tap so trailing reference words are not clipped. */
export const RECITE_STOP_TAIL_MS = 400

export type ReciteRecordingCallbacks = {
  onDurationMs?: (ms: number) => void
  onMaxDurationReached?: () => void
}

export type ReciteCapturedRecording = {
  blob: Blob
  audioSeconds: number
}

function pickRecorderMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return undefined
}

function whisperUploadFilename(blob: Blob): string {
  const type = blob.type.toLowerCase()
  if (type.includes('mp4') || type.includes('m4a')) return 'recording.m4a'
  if (type.includes('mpeg') || type.includes('mp3')) return 'recording.mp3'
  if (type.includes('wav')) return 'recording.wav'
  if (type.includes('ogg')) return 'recording.ogg'
  return 'recording.webm'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function useMemorizationRecite() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartedAtRef = useRef(0)
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingCallbacksRef = useRef<ReciteRecordingCallbacks | undefined>(undefined)
  const recordingActiveRef = useRef(false)
  const recordingStartTokenRef = useRef(0)
  const stopInFlightRef = useRef<Promise<string> | null>(null)
  const captureInFlightRef = useRef<Promise<ReciteCapturedRecording> | null>(null)
  const transcribeAbortRef = useRef<AbortController | null>(null)

  const clearTimers = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }
  }, [])

  const stopMediaStream = useCallback(async () => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop()
      }
      mediaStreamRef.current = null
    }
  }, [])

  const stopMediaRecorder = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current
    mediaRecorderRef.current = null
    if (!recorder || recorder.state === 'inactive') {
      const type = audioChunksRef.current[0]?.type || 'audio/webm'
      return Promise.resolve(
        audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type }) : null
      )
    }
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm'
        resolve(audioChunksRef.current.length ? new Blob(audioChunksRef.current, { type }) : null)
      }
      recorder.stop()
    })
  }, [])

  const cleanup = useCallback(async () => {
    clearTimers()
    recordingCallbacksRef.current = undefined
    recordingActiveRef.current = false
    transcribeAbortRef.current?.abort()
    transcribeAbortRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    await stopMediaStream()
  }, [clearTimers, stopMediaStream])

  const startDurationTimer = useCallback(() => {
    clearTimers()
    durationTimerRef.current = setInterval(() => {
      recordingCallbacksRef.current?.onDurationMs?.(
        Date.now() - recordingStartedAtRef.current
      )
    }, 250)
    maxDurationTimerRef.current = setTimeout(() => {
      recordingCallbacksRef.current?.onMaxDurationReached?.()
    }, RECITE_MAX_DURATION_MS)
  }, [clearTimers])

  const startRecording = useCallback(
    async (callbacks?: ReciteRecordingCallbacks) => {
      if (!isWhisperReciteSupported()) {
        throw new Error('Recording is not supported in this browser. Use HTTPS or try another browser.')
      }
      const startToken = ++recordingStartTokenRef.current
      await cleanup()
      recordingStartedAtRef.current = Date.now()
      recordingCallbacksRef.current = callbacks

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (startToken !== recordingStartTokenRef.current) {
          for (const track of stream.getTracks()) {
            track.stop()
          }
          return
        }
        mediaStreamRef.current = stream
        const mimeType = pickRecorderMimeType()
        audioChunksRef.current = []
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        recorder.start()
        mediaRecorderRef.current = recorder

        if (startToken !== recordingStartTokenRef.current) {
          await cleanup()
          return
        }

        recordingActiveRef.current = true
        startDurationTimer()
      } catch (err) {
        await cleanup()
        throw err
      }
    },
    [cleanup, startDurationTimer]
  )

  const finishStopCapture = useCallback(async (): Promise<ReciteCapturedRecording> => {
    if (!recordingActiveRef.current) {
      await cleanup()
      throw new Error('No active recording.')
    }
    recordingActiveRef.current = false

    const durationMs = Math.max(0, Date.now() - recordingStartedAtRef.current)
    if (durationMs < RECITE_MIN_DURATION_MS) {
      await cleanup()
      throw new Error('Recording is too short. Try again.')
    }
    const maxAudioSeconds = RECITE_MAX_DURATION_MS / 1000
    const audioSeconds = Math.min(durationMs / 1000, maxAudioSeconds)

    const captureToken = recordingStartTokenRef.current
    await delay(RECITE_STOP_TAIL_MS)
    if (captureToken !== recordingStartTokenRef.current) {
      throw new Error('Recording cancelled.')
    }
    const blob = await stopMediaRecorder()
    await stopMediaStream()
    clearTimers()
    if (!blob || blob.size === 0) {
      throw new Error('No audio recorded. Try again.')
    }

    return { blob, audioSeconds }
  }, [cleanup, clearTimers, stopMediaRecorder, stopMediaStream])

  const stopRecordingCapture = useCallback(async (): Promise<ReciteCapturedRecording> => {
    if (captureInFlightRef.current) {
      return captureInFlightRef.current
    }
    captureInFlightRef.current = finishStopCapture().finally(() => {
      captureInFlightRef.current = null
    })
    return captureInFlightRef.current
  }, [finishStopCapture])

  const transcribeCapturedRecording = useCallback(
    async (params: {
      blob: Blob
      audioSeconds: number
      memorizedItemId?: string
      prompt?: string
    }): Promise<string> => {
      const form = new FormData()
      form.append('audio', params.blob, whisperUploadFilename(params.blob))
      form.append('audio_seconds', String(params.audioSeconds))
      if (params.memorizedItemId) {
        form.append('memorized_item_id', params.memorizedItemId)
      }
      if (params.prompt) {
        form.append('prompt', params.prompt)
      }

      transcribeAbortRef.current = new AbortController()
      const signal = transcribeAbortRef.current.signal
      try {
        const response = await fetch('/api/memorization/recite/transcribe', {
          method: 'POST',
          body: form,
          signal,
        })
        const payload = (await response.json()) as { transcript?: string; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Transcription failed')
        }
        const transcript = payload.transcript?.trim() ?? ''
        if (!transcript) {
          throw new Error('No speech detected in the recording.')
        }
        return transcript
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error('Transcription cancelled.')
        }
        throw err
      } finally {
        transcribeAbortRef.current = null
      }
    },
    []
  )

  const cancelRecording = useCallback(async () => {
    recordingStartTokenRef.current += 1
    transcribeAbortRef.current?.abort()
    const inFlight = stopInFlightRef.current
    const capture = captureInFlightRef.current
    await cleanup()
    if (capture) {
      void capture.catch(() => {
        // ignore errors from an in-flight capture cancelled by cleanup
      })
    }
    if (inFlight) {
      try {
        await inFlight
      } catch {
        // ignore errors from an in-flight stop cancelled by cleanup
      }
    }
  }, [cleanup])

  return {
    startRecording,
    stopRecordingCapture,
    transcribeCapturedRecording,
    cancelRecording,
  }
}
