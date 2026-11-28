'use client'

import { useCallback, useState } from 'react'
import SettingsSectionChevron from '@/components/admin/SettingsSectionChevron'
import { logger } from '@/lib/logger'
import type { GrokVoiceCodeView } from '@/lib/grokVoiceDb'

const fieldClass =
  'h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-base sm:text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

function statusLabel(status: GrokVoiceCodeView['status']): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'expired':
      return 'Expired'
    case 'revoked':
      return 'Revoked'
    default: {
      const unreachable: never = status
      return unreachable
    }
  }
}

function formatMinutes(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function formatDollars(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatWhen(iso: string | null): string {
  if (!iso) return 'Never'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function GrokVoiceCodesSettings() {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codes, setCodes] = useState<GrokVoiceCodeView[]>([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [maxDevices, setMaxDevices] = useState('3')
  const [creating, setCreating] = useState(false)
  const [issuedCode, setIssuedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [openCodeId, setOpenCodeId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/grok-voice-codes', { cache: 'no-store' })
      const body = (await response.json()) as { codes?: GrokVoiceCodeView[]; error?: string }
      if (!response.ok || !Array.isArray(body.codes)) {
        throw new Error(body.error || 'Could not load Grok voice codes')
      }
      setCodes(body.codes)
      setLoaded(true)
    } catch (err) {
      logger.error('[GrokVoiceCodesSettings] load failed')
      setError(err instanceof Error ? err.message : 'Could not load Grok voice codes')
    } finally {
      setLoading(false)
    }
  }, [])

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !loaded && !loading) void load()
  }

  const createCode = async () => {
    const trimmed = name.trim()
    const days = Number(expiresInDays)
    const devices = Number(maxDevices)
    if (!trimmed) {
      setError('Enter who this code is for.')
      return
    }
    if (!Number.isInteger(days) || days < 1 || days > 366) {
      setError('Unused codes can expire between 1 and 366 days.')
      return
    }
    if (!Number.isInteger(devices) || devices < 1 || devices > 100) {
      setError('A code can cover 1 to 100 devices.')
      return
    }
    setCreating(true)
    setError('')
    setCopied(false)
    try {
      const response = await fetch('/api/admin/grok-voice-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ name: trimmed, expiresInDays: days, maxDevices: devices }),
      })
      const body = (await response.json()) as { code?: unknown; error?: string }
      if (!response.ok || typeof body.code !== 'string') {
        throw new Error(body.error || 'Could not create a Grok voice code')
      }
      setIssuedCode(body.code)
      setName('')
      await load()
    } catch (err) {
      logger.error('[GrokVoiceCodesSettings] create failed')
      setError(err instanceof Error ? err.message : 'Could not create a Grok voice code')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (path: string) => {
    setError('')
    try {
      const response = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ revoked: true }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || 'Could not revoke')
      }
      await load()
    } catch (err) {
      logger.error('[GrokVoiceCodesSettings] revoke failed')
      setError(err instanceof Error ? err.message : 'Could not revoke')
    }
  }

  const copyIssued = async () => {
    if (!issuedCode) return
    try {
      await navigator.clipboard.writeText(issuedCode)
      setCopied(true)
    } catch {
      setCopied(false)
      setError('Could not copy the code. Select it and copy it yourself.')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 overflow-hidden">
      <button
        type="button"
        className="w-full text-left px-6 sm:px-8 py-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        onClick={toggle}
        aria-expanded={expanded}
      >
        <span>
          <span className="block text-2xl font-bold text-slate-900 dark:text-slate-100">Grok voice codes</span>
          <span className="block text-slate-600 dark:text-slate-300 text-sm mt-2">
            Create a code for someone who should hear Grok voices in Listen. The code is shown once.
          </span>
        </span>
        <SettingsSectionChevron expanded={expanded} />
      </button>
      {expanded ? (
        <div className="px-6 sm:px-8 py-6 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          {error ? (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          {issuedCode ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="text-sm font-medium">Copy this code now. It will not be shown again.</p>
              <p className="mt-2 font-mono text-lg tracking-wide">{issuedCode}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyIssued()}
                  className="cursor-pointer rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIssuedCode(null)
                    setCopied(false)
                  }}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_8rem_8rem_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              void createCode()
            }}
          >
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Unused for days
              <input
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                inputMode="numeric"
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              Max devices
              <input
                value={maxDevices}
                onChange={(event) => setMaxDevices(event.target.value)}
                inputMode="numeric"
                className={fieldClass}
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="h-10 cursor-pointer rounded-md bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create code'}
            </button>
          </form>
          {loading && !loaded ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading…</p> : null}
          {loaded ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm text-slate-800 dark:text-slate-100">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-600 dark:text-slate-300">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pr-3 font-medium">Devices</th>
                    <th className="py-2 pr-3 font-medium">This month</th>
                    <th className="py-2 pr-3 font-medium">All time</th>
                    <th className="py-2 pr-3 font-medium">Last used</th>
                    <th className="py-2 font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {codes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-3 text-slate-500 dark:text-slate-300">
                        No codes yet.
                      </td>
                    </tr>
                  ) : (
                    codes.map((code) => (
                      <CodeRows
                        key={code.id}
                        code={code}
                        open={openCodeId === code.id}
                        onToggle={() => setOpenCodeId((current) => (current === code.id ? null : code.id))}
                        onRevokeCode={() => void revoke(`/api/admin/grok-voice-codes/${code.id}`)}
                        onRevokeDevice={(deviceId) => void revoke(`/api/admin/grok-voice-devices/${deviceId}`)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CodeRows({
  code,
  open,
  onToggle,
  onRevokeCode,
  onRevokeDevice,
}: {
  code: GrokVoiceCodeView
  open: boolean
  onToggle: () => void
  onRevokeCode: () => void
  onRevokeDevice: (deviceId: string) => void
}) {
  const estimate = code.includesEstimate ? ' est.' : ''
  return (
    <>
      <tr className="border-b border-slate-100 dark:border-slate-700">
        <td className="py-2 pr-3">{code.name}</td>
        <td className="py-2 pr-3">{statusLabel(code.status)}</td>
        <td className="py-2 pr-3">
          {code.devicesUsed}/{code.maxDevices}
        </td>
        <td className="py-2 pr-3">
          {formatMinutes(code.minutesThisMonth)} min · {formatDollars(code.dollarsThisMonth)}
          {estimate}
        </td>
        <td className="py-2 pr-3">
          {formatMinutes(code.minutesAllTime)} min · {formatDollars(code.dollarsAllTime)}
          {estimate}
        </td>
        <td className="py-2 pr-3">{formatWhen(code.lastUsedAt)}</td>
        <td className="py-2">
          <div className="flex gap-2">
            <button type="button" className="cursor-pointer text-xs font-medium underline" onClick={onToggle}>
              {open ? 'Hide devices' : 'Devices'}
            </button>
            {code.status !== 'revoked' ? (
              <button type="button" className="cursor-pointer text-xs font-medium text-red-700 dark:text-red-300" onClick={onRevokeCode}>
                Revoke code
              </button>
            ) : null}
          </div>
        </td>
      </tr>
      {open
        ? code.devices.map((device) => (
            <tr key={device.id} className="border-b border-slate-100 bg-slate-50 text-xs dark:border-slate-700 dark:bg-slate-900/40">
              <td className="py-2 pr-3 pl-4" colSpan={3}>
                {device.label || 'Unlabeled device'}
                {device.revoked ? ' · revoked' : ''}
              </td>
              <td className="py-2 pr-3">
                {formatMinutes(device.minutesThisMonth)} min · {formatDollars(device.dollarsThisMonth)}
              </td>
              <td className="py-2 pr-3">
                {formatMinutes(device.minutesAllTime)} min · {formatDollars(device.dollarsAllTime)}
              </td>
              <td className="py-2 pr-3">{formatWhen(device.lastUsedAt)}</td>
              <td className="py-2">
                {device.revoked ? null : (
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-red-700 dark:text-red-300"
                    onClick={() => onRevokeDevice(device.id)}
                  >
                    Revoke device
                  </button>
                )}
              </td>
            </tr>
          ))
        : null}
    </>
  )
}
