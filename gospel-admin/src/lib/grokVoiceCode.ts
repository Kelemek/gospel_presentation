import { createHash, randomBytes, randomInt } from 'crypto'

/** 31 symbols. Drops 0/O, 1/I/L so a code can be read aloud. */
export const GROK_VOICE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const ALPHABET_SET = new Set(GROK_VOICE_CODE_ALPHABET)

/** xAI text-to-speech list price used for admin totals. */
export const GROK_VOICE_USD_PER_MILLION_CHARS = 15

/** Fallback speaking rate when the audio duration cannot be measured. */
export const GROK_VOICE_ESTIMATED_CHARS_PER_SECOND = 15

export const GROK_VOICE_CODE_BYTES = 12
export const GROK_VOICE_TOKEN_PREFIX = 'gvt_'
export const GROK_VOICE_TOKEN_RANDOM_BYTES = 32

export function normalizeGrokVoiceCode(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, '')
  if (compact.length !== GROK_VOICE_CODE_BYTES) return null
  for (const char of compact) {
    if (!ALPHABET_SET.has(char)) return null
  }
  return compact
}

export function formatGrokVoiceCode(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`
}

export function generateGrokVoiceCode(): string {
  let compact = ''
  for (let i = 0; i < GROK_VOICE_CODE_BYTES; i += 1) {
    compact += GROK_VOICE_CODE_ALPHABET[randomInt(GROK_VOICE_CODE_ALPHABET.length)]
  }
  return formatGrokVoiceCode(compact)
}

export function generateGrokVoiceToken(): string {
  return `${GROK_VOICE_TOKEN_PREFIX}${randomBytes(GROK_VOICE_TOKEN_RANDOM_BYTES).toString('base64url')}`
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function grokVoiceCostUsd(chars: number): number {
  if (!Number.isFinite(chars) || chars <= 0) return 0
  return (chars * GROK_VOICE_USD_PER_MILLION_CHARS) / 1_000_000
}

export function chicagoMonthKey(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) {
    throw new Error('Could not resolve America/Chicago month')
  }
  return `${year}-${month}`
}

/**
 * Mirrors `redeem_grok_voice_code`: unused codes expire, revoked codes never
 * redeem, and only devices that are still active count toward the cap.
 */
export function evaluateGrokVoiceRedeem(input: {
  found: boolean
  codeRevoked: boolean
  expiresAt: Date
  activeDevices: number
  maxDevices: number
  now: Date
}): 'ok' | 'denied' {
  if (!input.found || input.codeRevoked) return 'denied'
  if (input.activeDevices <= 0 && input.expiresAt.getTime() <= input.now.getTime()) return 'denied'
  if (input.activeDevices >= input.maxDevices) return 'denied'
  return 'ok'
}

export function grokVoiceCodeStatus(input: {
  revokedAt: string | null
  expiresAt: string
  activeDevices: number
  now: Date
}): 'active' | 'expired' | 'revoked' {
  if (input.revokedAt) return 'revoked'
  if (input.activeDevices === 0 && Date.parse(input.expiresAt) <= input.now.getTime()) return 'expired'
  return 'active'
}

export function audioSecondsFromGraphTimes(graphTimes: readonly (readonly number[])[]): number | null {
  const last = graphTimes[graphTimes.length - 1]
  if (!last || last.length < 2) return null
  const end = last[1]
  if (typeof end !== 'number' || !Number.isFinite(end) || end < 0) return null
  return end
}

const MPEG1_L3_BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
const MPEG2_L3_BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
const MPEG1_RATES = [44100, 48000, 32000]
const MPEG2_RATES = [22050, 24000, 16000]
const MPEG25_RATES = [11025, 12000, 8000]

function syncSafeSize(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  )
}

/** Duration of a Layer III stream. Returns null when the bytes are not an MP3. */
export function mp3DurationSeconds(bytes: Uint8Array): number | null {
  let offset = 0
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    offset = 10 + syncSafeSize(bytes, 6)
    if ((bytes[5] & 0x10) !== 0) offset += 10
  }

  let totalSamples = 0
  let sampleRate = 0
  let frames = 0
  while (offset + 4 <= bytes.length && frames < 200_000) {
    const b0 = bytes[offset]
    const b1 = bytes[offset + 1]
    const b2 = bytes[offset + 2]
    if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) {
      offset += 1
      continue
    }
    const versionBits = (b1 >> 3) & 0x3
    const layerBits = (b1 >> 1) & 0x3
    const bitrateIndex = (b2 >> 4) & 0xf
    const sampleIndex = (b2 >> 2) & 0x3
    const padding = (b2 >> 1) & 0x1
    if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) {
      offset += 1
      continue
    }
    const mpeg1 = versionBits === 3
    const bitrateKbps = (mpeg1 ? MPEG1_L3_BITRATES : MPEG2_L3_BITRATES)[bitrateIndex]
    const rate = (mpeg1 ? MPEG1_RATES : versionBits === 2 ? MPEG2_RATES : MPEG25_RATES)[sampleIndex]
    const samplesPerFrame = mpeg1 ? 1152 : 576
    const frameLength = Math.floor(((samplesPerFrame / 8) * (bitrateKbps * 1000)) / rate) + padding
    if (!bitrateKbps || !rate || frameLength < 4 || offset + frameLength > bytes.length) {
      offset += 1
      continue
    }
    if (sampleRate === 0) sampleRate = rate
    else if (sampleRate !== rate) return null
    totalSamples += samplesPerFrame
    frames += 1
    offset += frameLength
  }
  if (frames === 0 || sampleRate === 0) return null
  return totalSamples / sampleRate
}

export type GrokAudioDuration = { seconds: number; estimated: boolean }

export function resolveGrokAudioSeconds(input: {
  chars: number
  graphTimes?: readonly (readonly number[])[] | null
  audioBytes?: Uint8Array | null
}): GrokAudioDuration {
  if (input.graphTimes && input.graphTimes.length > 0) {
    const fromTimes = audioSecondsFromGraphTimes(input.graphTimes)
    if (fromTimes != null) return { seconds: fromTimes, estimated: false }
  }
  if (input.audioBytes && input.audioBytes.byteLength > 0) {
    const fromMp3 = mp3DurationSeconds(input.audioBytes)
    if (fromMp3 != null) return { seconds: fromMp3, estimated: false }
  }
  const chars = Number.isFinite(input.chars) && input.chars > 0 ? input.chars : 0
  return { seconds: chars / GROK_VOICE_ESTIMATED_CHARS_PER_SECOND, estimated: true }
}

export type GrokVoiceUsageRow = {
  deviceId: string
  monthKey: string
  chars: number
  audioSeconds: number
  costUsd: number
  includesEstimate: boolean
}

export type GrokVoiceUsageTotals = {
  chars: number
  audioSeconds: number
  costUsd: number
  includesEstimate: boolean
  monthAudioSeconds: number
  monthCostUsd: number
  monthIncludesEstimate: boolean
}

export function summarizeGrokVoiceUsage(rows: readonly GrokVoiceUsageRow[], monthKey: string): GrokVoiceUsageTotals {
  const totals: GrokVoiceUsageTotals = {
    chars: 0,
    audioSeconds: 0,
    costUsd: 0,
    includesEstimate: false,
    monthAudioSeconds: 0,
    monthCostUsd: 0,
    monthIncludesEstimate: false,
  }
  for (const row of rows) {
    totals.chars += row.chars
    totals.audioSeconds += row.audioSeconds
    totals.costUsd += row.costUsd
    totals.includesEstimate = totals.includesEstimate || row.includesEstimate
    if (row.monthKey === monthKey) {
      totals.monthAudioSeconds += row.audioSeconds
      totals.monthCostUsd += row.costUsd
      totals.monthIncludesEstimate = totals.monthIncludesEstimate || row.includesEstimate
    }
  }
  return totals
}

export function audioMinutes(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return seconds / 60
}
