import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  audioMinutes,
  chicagoMonthKey,
  generateGrokVoiceCode,
  grokVoiceCodeStatus,
  normalizeGrokVoiceCode,
  sha256Hex,
  summarizeGrokVoiceUsage,
  type GrokVoiceUsageRow,
} from '@/lib/grokVoiceCode'

type DbError = { message: string; code?: string } | null
type DbResult = { data: unknown; error: DbError }

type Builder = {
  select: (columns?: string) => Builder
  insert: (row: Record<string, unknown>) => Builder
  update: (row: Record<string, unknown>) => Builder
  eq: (column: string, value: string) => Builder
  is: (column: string, value: null) => Builder
  order: (column: string, options: { ascending: boolean }) => Builder
  single: () => Promise<DbResult>
  maybeSingle: () => Promise<DbResult>
  then: Promise<DbResult>['then']
}

type GrokAdmin = {
  from: (table: string) => Builder
  rpc: (fn: string, args: Record<string, unknown>) => Promise<DbResult>
}

export const GROK_REDEEM_IP_MAX = 5
export const GROK_REDEEM_IP_WINDOW_SECONDS = 10 * 60
export const GROK_REDEEM_FAILURE_MAX = 60
export const GROK_REDEEM_FAILURE_WINDOW_SECONDS = 60 * 60
export const GROK_REDEEM_FAILURE_BUCKET = 'redeem:failures'
export const GROK_TTS_DEVICE_MAX = 20
export const GROK_TTS_DEVICE_WINDOW_SECONDS = 60
export const GROK_TTS_IP_MAX = 60
export const GROK_TTS_IP_WINDOW_SECONDS = 60

export function grokRedeemIpBucket(ip: string): string {
  return `redeem:ip:${ip.slice(0, 160)}`
}

export function grokTtsDeviceBucket(deviceId: string): string {
  return `tts:device:${deviceId}`
}

export function grokTtsIpBucket(ip: string): string {
  return `tts:ip:${ip.slice(0, 160)}`
}

function admin(): GrokAdmin {
  return createAdminClient() as unknown as GrokAdmin
}

function asObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  return data as Record<string, unknown>
}

function asRows(data: unknown): Record<string, unknown>[] | null {
  if (!Array.isArray(data)) return null
  return data.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
}

function num(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

export type GrokVoiceDenied = { ok: false; denied: true }
export type GrokVoiceUnavailable = { ok: false; unavailable: true }

export async function redeemGrokVoiceCode(input: {
  codeHash: string
  tokenHash: string
  deviceLabel: string | null
}): Promise<{ ok: true; codeId: string; deviceId: string } | GrokVoiceDenied | GrokVoiceUnavailable> {
  try {
    const { data, error } = await admin().rpc('redeem_grok_voice_code', {
      p_code_hash: input.codeHash,
      p_token_hash: input.tokenHash,
      p_device_label: input.deviceLabel,
    })
    if (error) return { ok: false, unavailable: true }
    const row = asObject(data)
    if (!row) return { ok: false, unavailable: true }
    if (row.ok !== true) return { ok: false, denied: true }
    if (typeof row.code_id !== 'string' || typeof row.device_id !== 'string') {
      return { ok: false, unavailable: true }
    }
    return { ok: true, codeId: row.code_id, deviceId: row.device_id }
  } catch {
    logger.error('grok voice redeem failed', { status: 'error' })
    return { ok: false, unavailable: true }
  }
}

export async function lookupGrokVoiceToken(
  tokenHash: string
): Promise<{ ok: true; codeId: string; deviceId: string } | GrokVoiceDenied | GrokVoiceUnavailable> {
  try {
    const { data, error } = await admin().rpc('lookup_grok_voice_token', { p_token_hash: tokenHash })
    if (error) return { ok: false, unavailable: true }
    const row = asObject(data)
    if (!row) return { ok: false, unavailable: true }
    if (row.ok !== true) return { ok: false, denied: true }
    if (typeof row.code_id !== 'string' || typeof row.device_id !== 'string') {
      return { ok: false, unavailable: true }
    }
    return { ok: true, codeId: row.code_id, deviceId: row.device_id }
  } catch {
    logger.error('grok voice token lookup failed', { status: 'error' })
    return { ok: false, unavailable: true }
  }
}

export async function recordGrokVoiceUsage(input: {
  tokenHash: string
  chars: number
  audioSeconds: number
  estimated: boolean
}): Promise<{ ok: true; codeId: string; deviceId: string; chars: number } | GrokVoiceDenied | GrokVoiceUnavailable> {
  try {
    const { data, error } = await admin().rpc('record_grok_voice_usage', {
      p_token_hash: input.tokenHash,
      p_chars: input.chars,
      p_audio_seconds: input.audioSeconds,
      p_estimated: input.estimated,
    })
    if (error) return { ok: false, unavailable: true }
    const row = asObject(data)
    if (!row) return { ok: false, unavailable: true }
    if (row.ok !== true) return { ok: false, denied: true }
    if (typeof row.code_id !== 'string' || typeof row.device_id !== 'string') {
      return { ok: false, unavailable: true }
    }
    return { ok: true, codeId: row.code_id, deviceId: row.device_id, chars: num(row.chars) }
  } catch {
    logger.error('grok voice usage record failed', { status: 'error' })
    return { ok: false, unavailable: true }
  }
}

async function rateFlag(
  fn: 'consume_grok_voice_rate_limit' | 'grok_voice_rate_limit_open',
  bucketKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ ok: true; allowed: boolean } | GrokVoiceUnavailable> {
  try {
    const { data, error } = await admin().rpc(fn, {
      p_bucket_key: bucketKey,
      p_max_attempts: maxAttempts,
      p_window_seconds: windowSeconds,
    })
    if (error || typeof data !== 'boolean') return { ok: false, unavailable: true }
    return { ok: true, allowed: data }
  } catch {
    logger.error('grok voice rate limit failed', { status: 'error' })
    return { ok: false, unavailable: true }
  }
}

export function consumeGrokVoiceRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ ok: true; allowed: boolean } | GrokVoiceUnavailable> {
  return rateFlag('consume_grok_voice_rate_limit', bucketKey, maxAttempts, windowSeconds)
}

export function grokVoiceRateLimitOpen(
  bucketKey: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ ok: true; allowed: boolean } | GrokVoiceUnavailable> {
  return rateFlag('grok_voice_rate_limit_open', bucketKey, maxAttempts, windowSeconds)
}

export type IssuedGrokVoiceCode = {
  id: string
  name: string
  code: string
  expiresAt: string
  maxDevices: number
}

export async function issueGrokVoiceCode(input: {
  name: string
  expiresInDays: number
  maxDevices: number
  createdBy: string
}): Promise<{ ok: true; issued: IssuedGrokVoiceCode } | GrokVoiceUnavailable> {
  const client = admin()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateGrokVoiceCode()
    const compact = normalizeGrokVoiceCode(code)
    if (!compact) continue
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    try {
      const { data, error } = await client
        .from('grok_voice_codes')
        .insert({
          name: input.name,
          code_hash: sha256Hex(compact),
          max_devices: input.maxDevices,
          expires_at: expiresAt,
          created_by: input.createdBy,
        })
        .select('id, name, expires_at, max_devices')
        .single()
      if (error?.code === '23505') continue
      if (error || !data) return { ok: false, unavailable: true }
      const row = asObject(data)
      if (!row || typeof row.id !== 'string') return { ok: false, unavailable: true }
      return {
        ok: true,
        issued: {
          id: row.id,
          name: typeof row.name === 'string' ? row.name : input.name,
          code,
          expiresAt: typeof row.expires_at === 'string' ? row.expires_at : expiresAt,
          maxDevices: num(row.max_devices) || input.maxDevices,
        },
      }
    } catch {
      logger.error('grok voice code create failed', { status: 'error' })
      return { ok: false, unavailable: true }
    }
  }
  logger.error('grok voice code create failed', { status: 'error' })
  return { ok: false, unavailable: true }
}

export type GrokVoiceDeviceView = {
  id: string
  label: string | null
  revoked: boolean
  createdAt: string
  lastUsedAt: string | null
  minutesThisMonth: number
  dollarsThisMonth: number
  minutesAllTime: number
  dollarsAllTime: number
  includesEstimate: boolean
}

export type GrokVoiceCodeView = {
  id: string
  name: string
  status: 'active' | 'expired' | 'revoked'
  devicesUsed: number
  maxDevices: number
  minutesThisMonth: number
  dollarsThisMonth: number
  minutesAllTime: number
  dollarsAllTime: number
  includesEstimate: boolean
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string
  devices: GrokVoiceDeviceView[]
}

export async function listGrokVoiceCodes(now = new Date()): Promise<
  { ok: true; codes: GrokVoiceCodeView[] } | GrokVoiceUnavailable
> {
  try {
    const client = admin()
    const codesResult = await client
      .from('grok_voice_codes')
      .select('*')
      .order('created_at', { ascending: false })
    const devicesResult = await client.from('grok_voice_devices').select('*')
    const usageResult = await client.from('grok_voice_usage').select('*')
    if (codesResult.error || devicesResult.error || usageResult.error) {
      return { ok: false, unavailable: true }
    }
    const codeRows = asRows(codesResult.data)
    const deviceRows = asRows(devicesResult.data)
    const usageRows = asRows(usageResult.data)
    if (!codeRows || !deviceRows || !usageRows) return { ok: false, unavailable: true }

    const monthKey = chicagoMonthKey(now)
    const codes = codeRows
      .filter((row) => typeof row.id === 'string' && typeof row.name === 'string')
      .map((row) => {
        const id = row.id as string
        const devices = deviceRows.filter((device) => device.code_id === id)
        const activeDevices = devices.filter((device) => !device.revoked_at).length
        const usage = usageRows
          .filter((entry) => entry.code_id === id)
          .map(
            (entry): GrokVoiceUsageRow => ({
              deviceId: typeof entry.device_id === 'string' ? entry.device_id : '',
              monthKey: typeof entry.month_key === 'string' ? entry.month_key : '',
              chars: num(entry.chars),
              audioSeconds: num(entry.audio_seconds),
              costUsd: num(entry.cost_usd),
              includesEstimate: entry.includes_estimate === true,
            })
          )
        const totals = summarizeGrokVoiceUsage(usage, monthKey)
        const lastUsedAt = devices.reduce<string | null>((latest, device) => {
          const value = text(device.last_used_at)
          if (!value) return latest
          if (!latest || value > latest) return value
          return latest
        }, null)
        const viewDevices: GrokVoiceDeviceView[] = devices
          .filter((device) => typeof device.id === 'string')
          .map((device) => {
            const deviceUsage = summarizeGrokVoiceUsage(
              usage.filter((entry) => entry.deviceId === device.id),
              monthKey
            )
            return {
              id: device.id as string,
              label: text(device.device_label),
              revoked: Boolean(device.revoked_at),
              createdAt: text(device.created_at) ?? '',
              lastUsedAt: text(device.last_used_at),
              minutesThisMonth: audioMinutes(deviceUsage.monthAudioSeconds),
              dollarsThisMonth: deviceUsage.monthCostUsd,
              minutesAllTime: audioMinutes(deviceUsage.audioSeconds),
              dollarsAllTime: deviceUsage.costUsd,
              includesEstimate: deviceUsage.includesEstimate,
            }
          })
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        return {
          id,
          name: row.name as string,
          status: grokVoiceCodeStatus({
            revokedAt: text(row.revoked_at),
            expiresAt: text(row.expires_at) ?? '',
            activeDevices,
            now,
          }),
          devicesUsed: activeDevices,
          maxDevices: num(row.max_devices),
          minutesThisMonth: audioMinutes(totals.monthAudioSeconds),
          dollarsThisMonth: totals.monthCostUsd,
          minutesAllTime: audioMinutes(totals.audioSeconds),
          dollarsAllTime: totals.costUsd,
          includesEstimate: totals.includesEstimate,
          lastUsedAt,
          createdAt: text(row.created_at) ?? '',
          expiresAt: text(row.expires_at) ?? '',
          devices: viewDevices,
        }
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return { ok: true, codes }
  } catch {
    logger.error('grok voice code list failed', { status: 'error' })
    return { ok: false, unavailable: true }
  }
}

async function revokeRow(table: 'grok_voice_codes' | 'grok_voice_devices', id: string): Promise<
  'revoked' | 'missing' | 'unavailable'
> {
  try {
    const client = admin()
    const updated = await client
      .from(table)
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle()
    if (updated.error) return 'unavailable'
    if (updated.data) return 'revoked'
    const existing = await client.from(table).select('id, revoked_at').eq('id', id).maybeSingle()
    if (existing.error) return 'unavailable'
    if (!existing.data) return 'missing'
    return 'revoked'
  } catch {
    logger.error('grok voice revoke failed', { status: 'error' })
    return 'unavailable'
  }
}

export function revokeGrokVoiceCode(id: string): Promise<'revoked' | 'missing' | 'unavailable'> {
  return revokeRow('grok_voice_codes', id)
}

export function revokeGrokVoiceDevice(id: string): Promise<'revoked' | 'missing' | 'unavailable'> {
  return revokeRow('grok_voice_devices', id)
}
